import { firedb } from "./firebase"
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, onSnapshot, orderBy, serverTimestamp, getDoc } from "firebase/firestore"
import { auth } from "./firebase"
import { logger } from "@/utils/logger"

// Collection reference
const statisticalReportsCollection = collection(firedb, "statisticalReports")

// Get all statistical reports
export const getAllStatisticalReports = async () => {
  try {
    const q = query(statisticalReportsCollection)
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    logger.error("Error fetching statistical reports:", error)
    throw error
  }
}

// Get statistical reports by project
export const getStatisticalReportsByProject = async (projectId) => {
  try {
    const q = query(statisticalReportsCollection, where("projectId", "==", projectId))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    logger.error("Error fetching project statistical reports:", error)
    throw error
  }
}

// Get reports by date range
export const getReportsByDateRange = async (startDate, endDate, projectId = null) => {
  try {
    let q = query(statisticalReportsCollection)

    if (projectId) {
      q = query(
        statisticalReportsCollection,
        where("projectId", "==", projectId),
        where("date", ">=", startDate),
        where("date", "<=", endDate),
      )
    } else {
      q = query(statisticalReportsCollection, where("date", ">=", startDate), where("date", "<=", endDate))
    }

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    logger.error("Error fetching reports by date range:", error)
    throw error
  }
}

// Get aggregated statistics
export const getAggregatedStatistics = async (projectId = null) => {
  try {
    const reports = projectId ? await getStatisticalReportsByProject(projectId) : await getAllStatisticalReports()

    return reports.reduce(
      (acc, report) => {
        // If projectId is null, we're getting all projects data
        if (!projectId || report.projectId === projectId) {
          return {
            threatVulnerabilities: (acc.threatVulnerabilities || 0) + (report.threatVulnerabilities || 0),
            threatDetections: (acc.threatDetections || 0) + (report.threatDetections || 0),
            socDetections: (acc.socDetections || 0) + (report.socDetections || 0),
            atipDetections: (acc.atipDetections || 0) + (report.atipDetections || 0),
            maliciousDomains: (acc.maliciousDomains || 0) + (report.maliciousDomains || 0),
          }
        }
        return acc
      },
      {
        threatVulnerabilities: 0,
        threatDetections: 0,
        socDetections: 0,
        atipDetections: 0,
        maliciousDomains: 0,
      },
    )
  } catch (error) {
    logger.error("Error calculating aggregated statistics:", error)
    throw error
  }
}

// Get monthly statistics for a specific year
export const getMonthlyStatistics = async (projectId = null, year) => {
  try {
    // Get start and end dates for the specified year
    const startOfYear = new Date(year, 0, 1) // January 1st
    const endOfYear = new Date(year, 11, 31, 23, 59, 59) // December 31st

    // Get reports within the date range
    const reports = await getReportsByDateRange(startOfYear.toISOString(), endOfYear.toISOString(), projectId)

    // Initialize monthly data structure
    const monthlyData = {}
    monthlyData[year] = {}

    // Initialize each month with zero values
    for (let month = 0; month < 12; month++) {
      monthlyData[year][month] = {
        threatVulnerabilities: 0,
        threatDetections: 0,
        socDetections: 0,
        atipDetections: 0,
        maliciousDomains: 0,
      }
    }

    // Aggregate reports by month
    reports.forEach((report) => {
      const monthIndex = report.month

      // If projectId is null, we're getting all projects data
      if (!projectId || report.projectId === projectId) {
        monthlyData[year][monthIndex].threatVulnerabilities += report.threatVulnerabilities || 0
        monthlyData[year][monthIndex].threatDetections += report.threatDetections || 0
        monthlyData[year][monthIndex].socDetections += report.socDetections || 0
        monthlyData[year][monthIndex].atipDetections += report.atipDetections || 0
        monthlyData[year][monthIndex].maliciousDomains += report.maliciousDomains || 0
      }
    })

    return monthlyData
  } catch (error) {
    logger.error("Error calculating monthly statistics:", error)
    throw error
  }
}

// Delete statistical data
export const deleteStatisticalData = async (projectId, category, year, month = null) => {
  try {
    logger.info('Deleting data with params:', { projectId, category, year, month });

    if (!projectId || projectId === 'all') {
      throw new Error('A specific project must be selected to delete data');
    }

    // Build the base query
    let q = query(
      statisticalReportsCollection,
      where("projectId", "==", projectId),
      where("year", "==", year)
    );

    // Add month filter if specified
    if (month !== null) {
      q = query(q, where("month", "==", month));
    }

    logger.info('Executing delete query...');
    const querySnapshot = await getDocs(q);
    logger.info(`Found ${querySnapshot.size} documents to process`);

    if (querySnapshot.empty) {
      logger.info('No matching documents found');
      return { success: true, message: 'No data found to delete' };
    }

    const deletePromises = [];
    const updatePromises = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      logger.info('Processing document:', doc.id, data);

      if (category === 'all') {
        // Delete the entire document
        logger.info('Deleting entire document:', doc.id);
        deletePromises.push(deleteDoc(doc.ref));
      } else {
        // Check if this is the only non-zero category in the document
        const otherCategories = ['threatVulnerabilities', 'threatDetections', 'socDetections', 'atipDetections', 'maliciousDomains']
          .filter(cat => cat !== category)
          .filter(cat => data[cat] > 0);

        if (otherCategories.length === 0) {
          // If this is the only category with data, delete the entire document
          logger.info('Deleting document as it has no other non-zero categories:', doc.id);
          deletePromises.push(deleteDoc(doc.ref));
        } else {
          // Update the document to set the specified category to 0
          const updatedData = { ...data };
          updatedData[category] = 0;
          updatedData.updatedAt = serverTimestamp();
          logger.info('Updating document:', doc.id, 'Setting category to 0:', category);
          updatePromises.push(updateDoc(doc.ref, updatedData));
        }
      }
    });

    // Execute all delete and update operations
    await Promise.all([...deletePromises, ...updatePromises]);
    logger.info('Delete/Update operations completed successfully');
    
    return { success: true, message: 'Data deleted successfully' };
  } catch (error) {
    logger.error('Detailed error in deleteStatisticalData:', error);
    return { success: false, error: error.message };
  }
}

// Get report by project, year, and month
export const getReportByProjectYearMonth = async (projectId, year, month) => {
  try {
    const q = query(
      statisticalReportsCollection,
      where("projectId", "==", projectId),
      where("year", "==", year),
      where("month", "==", month),
    )
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return null
    }

    // Return the first matching document
    const doc = querySnapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data(),
    }
  } catch (error) {
    logger.error("Error fetching report by project/year/month:", error)
    throw error
  }
}

// Add or update statistical report
export const addOrUpdateStatisticalReport = async (reportData) => {
  try {
    logger.info('Starting addOrUpdateStatisticalReport with data:', reportData);

    if (!reportData.projectId || reportData.year === undefined || reportData.month === undefined) {
      throw new Error('Missing required fields: projectId, year, and month are required');
    }

    // Check if a report already exists for this project/year/month
    const existingReport = await getReportByProjectYearMonth(reportData.projectId, reportData.year, reportData.month);
    logger.info('Existing report found:', existingReport);

    if (existingReport) {
      // Update existing report
      const reportRef = doc(firedb, "statisticalReports", existingReport.id);
      logger.info('Updating existing report with ID:', existingReport.id);

      // For each category in the new data, update the existing value
      const updatedData = { ...existingReport };

      // Update only the categories that exist in the new data
      Object.keys(reportData).forEach((key) => {
        if (["threatVulnerabilities", "threatDetections", "socDetections", "atipDetections", "maliciousDomains"].includes(key)) {
          updatedData[key] = reportData[key]; // Directly set the new value instead of adding
        }
      });

      logger.info('Updated data to be saved:', updatedData);
      await updateDoc(reportRef, {
        ...updatedData,
        updatedAt: serverTimestamp(),
      });

      return { success: true, id: existingReport.id };
    } else {
      // Add new report
      logger.info('Creating new report');
      const docRef = await addDoc(statisticalReportsCollection, {
        ...reportData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      logger.info('New report created with ID:', docRef.id);
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    logger.error('Detailed error in addOrUpdateStatisticalReport:', error);
    return { success: false, error: error.message };
  }
}

// Add dedicated edit function
export const editStatisticalReport = async (reportData) => {
  try {
    logger.info('Starting editStatisticalReport with data:', reportData);

    if (!reportData.projectId || reportData.year === undefined || reportData.month === undefined) {
      throw new Error('Missing required fields: projectId, year, and month are required');
    }

    // Check if a report exists for this project/year/month
    const existingReport = await getReportByProjectYearMonth(reportData.projectId, reportData.year, reportData.month);
    
    if (!existingReport) {
      throw new Error('No existing report found to edit');
    }

    // Update existing report
    const reportRef = doc(firedb, "statisticalReports", existingReport.id);
    logger.info('Updating existing report with ID:', existingReport.id);

    // Update only the specified category
    const updatedData = { ...existingReport };
    Object.keys(reportData).forEach((key) => {
      if (["threatVulnerabilities", "threatDetections", "socDetections", "atipDetections", "maliciousDomains"].includes(key)) {
        updatedData[key] = reportData[key];
      }
    });

    logger.info('Updated data to be saved:', updatedData);
    await updateDoc(reportRef, {
      ...updatedData,
      updatedAt: serverTimestamp(),
    });

    return { success: true, id: existingReport.id };
  } catch (error) {
    logger.error('Detailed error in editStatisticalReport:', error);
    return { success: false, error: error.message };
  }
}

// Update the add functions to use the new edit function
export const addThreatVulnerability = async (data) => {
  try {
    logger.info('Adding threat vulnerability data:', data);
    
    if (!data.tenant || !data.count || data.count <= 0) {
      throw new Error('Invalid data: tenant and count are required, and count must be greater than 0');
    }

    const currentUser = auth.currentUser;
    const addedBy = currentUser ? currentUser.email : 'system';
    
    const reportData = {
      projectId: data.tenant,
      threatVulnerabilities: parseInt(data.count),
      year: data.year,
      month: data.month,
      date: data.timestamp,
      addedBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    logger.info('Prepared report data:', reportData);
    
    const result = await addOrUpdateStatisticalReport(reportData);
    logger.info('Add/Update result:', result);
    
    return result;
  } catch (error) {
    logger.error('Detailed error in addThreatVulnerability:', error);
    return { success: false, error: error.message };
  }
}

// Add threat detection data
export const addThreatDetection = async (data) => {
  try {
    logger.info('Adding threat detection data:', data);
    
    if (!data.tenant || !data.count || data.count <= 0) {
      throw new Error('Invalid data: tenant and count are required, and count must be greater than 0');
    }

    const currentUser = auth.currentUser;
    const addedBy = currentUser ? currentUser.email : 'system';
    
    const reportData = {
      projectId: data.tenant,
      threatDetections: parseInt(data.count),
      year: data.year,
      month: data.month,
      date: data.timestamp,
      addedBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    logger.info('Prepared report data:', reportData);
    
    const result = await addOrUpdateStatisticalReport(reportData);
    logger.info('Add/Update result:', result);
    
    return { success: true, id: result };
  } catch (error) {
    logger.error('Detailed error in addThreatDetection:', error);
    return { success: false, error: error.message };
  }
}

// Add SOC Detection data
export const addSocDetection = async (data) => {
  try {
    logger.info('Adding SOC detection data:', data);
    
    if (!data.tenant || !data.count || data.count <= 0) {
      throw new Error('Invalid data: tenant and count are required, and count must be greater than 0');
    }

    const currentUser = auth.currentUser;
    const addedBy = currentUser ? currentUser.email : 'system';
    
    const reportData = {
      projectId: data.tenant,
      socDetections: parseInt(data.count),
      year: data.year,
      month: data.month,
      date: data.timestamp,
      addedBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    logger.info('Prepared report data:', reportData);
    
    const result = await addOrUpdateStatisticalReport(reportData);
    logger.info('Add/Update result:', result);
    
    return { success: true, id: result };
  } catch (error) {
    logger.error('Detailed error in addSocDetection:', error);
    return { success: false, error: error.message };
  }
}

// Add ATIP Detection data
export const addAtipDetection = async (data) => {
  try {
    logger.info('Adding ATIP detection data:', data);
    
    if (!data.tenant || !data.count || data.count <= 0) {
      throw new Error('Invalid data: tenant and count are required, and count must be greater than 0');
    }

    const currentUser = auth.currentUser;
    const addedBy = currentUser ? currentUser.email : 'system';
    
    const reportData = {
      projectId: data.tenant,
      atipDetections: parseInt(data.count),
      year: data.year,
      month: data.month,
      date: data.timestamp,
      addedBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    logger.info('Prepared report data:', reportData);
    
    const result = await addOrUpdateStatisticalReport(reportData);
    logger.info('Add/Update result:', result);
    
    return { success: true, id: result };
  } catch (error) {
    logger.error('Detailed error in addAtipDetection:', error);
    return { success: false, error: error.message };
  }
}

// Add Malicious Domain data
export const addMaliciousDomain = async (data) => {
  try {
    logger.info('Adding malicious domain data:', data);
    
    if (!data.tenant || !data.count || data.count <= 0) {
      throw new Error('Invalid data: tenant and count are required, and count must be greater than 0');
    }

    const currentUser = auth.currentUser;
    const addedBy = currentUser ? currentUser.email : 'system';
    
    const reportData = {
      projectId: data.tenant,
      maliciousDomains: parseInt(data.count),
      year: data.year,
      month: data.month,
      date: data.timestamp,
      addedBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    logger.info('Prepared report data:', reportData);
    
    const result = await addOrUpdateStatisticalReport(reportData);
    logger.info('Add/Update result:', result);
    
    return { success: true, id: result };
  } catch (error) {
    logger.error('Detailed error in addMaliciousDomain:', error);
    return { success: false, error: error.message };
  }
}
