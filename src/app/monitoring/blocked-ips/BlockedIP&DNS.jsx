"use client"
import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Shield, ShieldOff, Search, Plus, AlertTriangle, CheckCircle, Trash2, RefreshCw, Globe, Cpu, ChevronDown, Users, FileText, X, AlertCircle, Edit2 } from 'lucide-react';
import { 
  saveBlockedEntry, 
  getBlockedEntries, 
  updateBlockedEntry, 
  deleteBlockedEntry,
  listenToBlockedEntries
} from '@/services/management';
import { auth } from '@/services/firebase';
import { useRouter } from 'next/navigation';
import { getDoc, doc } from 'firebase/firestore';
import { firedb } from '@/services/firebase';
import { logger } from '@/utils/logger';

// Add project mapping constant
const PROJECT_MAPPING = {
  'NIKI': 'Project NIKI',
  'MWELL': 'Project Chiron',
  'MPIW': 'Project Hunt',
  'SiyCha Group of Companies': 'Project Orion',
  'Cantilan': 'Project Atlas'
};

const PROJECT_OPTIONS = [
  { value: 'NIKI', label: 'Project NIKI' },
  { value: 'MWELL', label: 'Project Chiron' },
  { value: 'MPIW', label: 'Project Hunt' },
  { value: 'SiyCha Group of Companies', label: 'Project Orion' },
  { value: 'Cantilan', label: 'Project Atlas' }
];

// Function to get project display name
const getProjectDisplayName = (projectKey) => {
  return PROJECT_MAPPING[projectKey] || projectKey;
};

// Add ActionConfirmationModal component
const ActionConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, actionType = 'block' }) => {
    if (!isOpen) return null;

    const isBlock = actionType === 'block';
    const isDelete = actionType === 'delete';
    const buttonColor = isDelete 
      ? 'from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500' 
      : isBlock 
        ? 'from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500' 
        : 'from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500';
    const iconColor = isDelete ? 'text-red-400' : isBlock ? 'text-green-400' : 'text-red-400';
    const bgColor = isDelete ? 'bg-red-500/20' : isBlock ? 'bg-green-500/20' : 'bg-red-500/20';

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-900/75 backdrop-blur-sm"></div>
                </div>

                <div className="inline-block transform overflow-hidden rounded-lg bg-gray-800 px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
                    <div className="sm:flex sm:items-start">
                        <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${bgColor} sm:mx-0 sm:h-10 sm:w-10`}>
                            {isDelete ? (
                                <Trash2 className={`h-6 w-6 ${iconColor}`} />
                            ) : isBlock ? (
                                <Shield className={`h-6 w-6 ${iconColor}`} />
                            ) : (
                                <ShieldOff className={`h-6 w-6 ${iconColor}`} />
                            )}
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg font-medium leading-6 text-gray-200">
                                {title}
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-400">
                                    {message}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            className={`inline-flex w-full justify-center rounded-lg bg-gradient-to-r ${buttonColor} px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm`}
                            onClick={onConfirm}
                        >
                            {isDelete ? 'Delete' : isBlock ? 'Block' : 'Unblock'}
                        </button>
                        <button
                            type="button"
                            className="mt-3 inline-flex w-full justify-center rounded-lg bg-gray-700 px-4 py-2 text-base font-medium text-gray-300 shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function BlockedIPAndDNS() {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [newEntry, setNewEntry] = useState({ type: 'IP', value: '', blocked: false, tenant: 'SiyCha Group of Companies' });
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterTenant, setFilterTenant] = useState('ALL');
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'lastDetected', direction: 'desc' });
  const [statsData, setStatsData] = useState({
    blockedIPs: 0,
    blockedDomains: 0,
    unblockedIPs: 0,
    unblockedDomains: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchEntries, setBatchEntries] = useState('');
  const [selectedEntries, setSelectedEntries] = useState(new Set());
  const [hasFirebaseError, setHasFirebaseError] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionModalConfig, setActionModalConfig] = useState({
    title: '',
    message: '',
    actionType: 'block',
    onConfirm: () => {}
  });
  const [userRole, setUserRole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Initialize data and set up real-time listener
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    // Get user role
    const getUserRole = async () => {
      try {
        setIsLoading(true); // Add loading state
        const userDoc = await getDoc(doc(firedb, 'users', user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      } catch (error) {
        logger.error('Error getting user role:', error);
      }
    };

    getUserRole();

    // Set up real-time listener with error handling
    try {
      setIsLoading(true); // Add loading state
      const unsubscribeFn = listenToBlockedEntries(
        { type: filterType, status: filterStatus, tenant: filterTenant },
        (entries) => {
          setEntries(entries);
          updateStats(entries);
          setHasFirebaseError(false); // Clear error state on successful connection
          setIsLoading(false); // Remove loading state after data is received
        },
        (error) => {
          logger.error('Firebase connection error:', error);
          setHasFirebaseError(true);
          setIsLoading(false); // Remove loading state on error
          toast.error('Connection error. Please check if any content blockers are enabled.');
        }
      );
      setUnsubscribe(() => unsubscribeFn);

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (error) {
      logger.error('Firebase setup error:', error);
      setHasFirebaseError(true);
      setIsLoading(false); // Remove loading state on error
      toast.error('Connection error. Please check if any content blockers are enabled.');
    }
  }, [filterType, filterStatus, filterTenant, router]);

  // Update statistics when entries change
  const updateStats = (entries) => {
    const blockedIPs = entries.filter(e => e.type === 'IP' && e.blocked).length;
    const blockedDomains = entries.filter(e => e.type === 'Domain' && e.blocked).length;
    const unblockedIPs = entries.filter(e => e.type === 'IP' && !e.blocked).length;
    const unblockedDomains = entries.filter(e => e.type === 'Domain' && !e.blocked).length;
    
    setStatsData({
      blockedIPs,
      blockedDomains,
      unblockedIPs,
      unblockedDomains
    });
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Add new entry
  const handleAddEntry = async () => {
    if (!newEntry.value) {
      toast.error('Please enter a value');
      return;
    }
    
    // Check for duplicate entry
    const cleanedValue = newEntry.value.trim().toLowerCase();
    const isDuplicate = entries.some(entry => 
      entry.value.toLowerCase() === cleanedValue && 
      entry.tenant === newEntry.tenant
    );

    if (isDuplicate) {
      toast.error(`This ${newEntry.type} is already registered for ${getProjectDisplayName(newEntry.tenant)}`);
      return;
    }
    
    // Validate IP address format if type is IP (now supporting CIDR notation)
    if (newEntry.type === 'IP') {
      // IPv4 with CIDR regex
      const ipv4CidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
      // IPv6 regex (supports various formats including compressed and CIDR)
      const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$|^fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+$|^::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])$|^([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])$/;
      const ipv6CidrRegex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,7}:(\/\d{1,3})?|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}(\/\d{1,3})?$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})(\/\d{1,3})?$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)(\/\d{1,3})?$/;

      const isIPv4 = ipv4CidrRegex.test(newEntry.value);
      const isIPv6 = ipv6Regex.test(newEntry.value) || ipv6CidrRegex.test(newEntry.value);

      if (!isIPv4 && !isIPv6) {
        toast.error('Invalid IP address format. Supported formats: IPv4, IPv4/CIDR, IPv6, or IPv6/CIDR');
        return;
      }
      
      // Validate IPv4 address numbers if it's an IPv4
      if (isIPv4) {
        const ipPart = newEntry.value.split('/')[0];
        const ipNumbers = ipPart.split('.').map(num => parseInt(num));
        const isValidIP = ipNumbers.every(num => num >= 0 && num <= 255);
        
        if (!isValidIP) {
          toast.error('Invalid IPv4 address numbers. Each number must be between 0 and 255');
          return;
        }
        
        // If CIDR is present, validate it
        if (newEntry.value.includes('/')) {
          const cidr = parseInt(newEntry.value.split('/')[1]);
          if (cidr < 0 || cidr > 32) {
            toast.error('Invalid IPv4 CIDR notation. Must be between 0 and 32');
            return;
          }
        }
      }
      
      // Validate IPv6 CIDR if present
      if (isIPv6 && newEntry.value.includes('/')) {
        const cidr = parseInt(newEntry.value.split('/')[1]);
        if (cidr < 0 || cidr > 128) {
          toast.error('Invalid IPv6 CIDR notation. Must be between 0 and 128');
          return;
        }
      }
    }
    
    // Validate domain format if type is Domain
    if (newEntry.type === 'Domain') {
      // More permissive domain validation regex
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9])*$/;
      logger.info('Validating domain:', newEntry.value);
      logger.info('Regex test result:', domainRegex.test(newEntry.value));
      if (!domainRegex.test(newEntry.value)) {
        toast.error('Invalid domain format');
        return;
      }
    }
    
    try {
      const result = await saveBlockedEntry(newEntry);
      
      if (result.success) {
        setNewEntry({ type: 'IP', value: '', blocked: false, tenant: 'NIKI' });
        setIsAddingEntry(false);
        toast.success(`${newEntry.type} added to list`);
      } else {
        toast.error(result.error || 'Failed to add entry');
      }
    } catch (error) {
      logger.error('Error adding entry:', error);
      toast.error('Failed to add entry');
    }
  };

  // Update entry
  const handleUpdateEntry = async (id, updatedFields) => {
    try {
      const result = await updateBlockedEntry(id, updatedFields);
      
      if (result.success) {
        toast.success(`Entry updated`);
      } else {
        toast.error(result.error || 'Failed to update entry');
      }
    } catch (error) {
      logger.error('Error updating entry:', error);
      toast.error('Failed to update entry');
    }
  };

  // Toggle entry blocked status with visual feedback
  const toggleBlockStatus = async (id) => {
    const entry = entries.find(e => e.id === id);
    const newStatus = !entry.blocked;
    
    setActionModalConfig({
      title: newStatus ? 'Block Entry' : 'Unblock Entry',
      message: `Are you sure you want to ${newStatus ? 'block' : 'unblock'} the ${entry.type} entry "${entry.value}"?`,
      actionType: newStatus ? 'block' : 'unblock',
      onConfirm: async () => {
        try {
          const result = await updateBlockedEntry(id, { blocked: newStatus });
          
          if (result.success) {
            if (newStatus) {
              toast.success(`${entry.type} ${entry.value} has been blocked`);
            } else {
              toast('Block removed', { icon: '🔓' });
            }
          } else {
            toast.error(result.error || 'Failed to update block status');
          }
        } catch (error) {
          logger.error('Error toggling block status:', error);
          toast.error('Failed to update block status');
        } finally {
          setActionModalOpen(false);
        }
      }
    });
    setActionModalOpen(true);
  };

  // Handle sort
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Refresh data
  const refreshData = async () => {
    setIsLoading(true);
    try {
      const entries = await getBlockedEntries({ type: filterType, status: filterStatus, tenant: filterTenant });
      setEntries(entries);
      updateStats(entries);
      toast.success('Data refreshed');
    } catch (error) {
      logger.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply sorting and filtering
  const getSortedAndFilteredEntries = () => {
    let filteredList = entries.filter((entry) => {
      const matchesSearch = !searchTerm || 
        entry.value.toLowerCase().includes(searchTerm.toLowerCase());
        
      return matchesSearch;
    });
    
    if (sortConfig.key) {
      filteredList.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filteredList;
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const filteredEntries = getSortedAndFilteredEntries();

  // Add batch entry handler
  const handleBatchEntry = async () => {
    if (!batchEntries.trim()) {
      toast.error('Please enter values');
      return;
    }

    const batchLines = batchEntries
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (batchLines.length === 0) {
      toast.error('No valid entries found');
      return;
    }

    const validEntries = [];
    const invalidEntries = [];
    const duplicateEntries = [];

    for (const entry of batchLines) {
      // Clean the entry by removing protocols and query parameters
      let cleanedEntry = entry
        .replace(/^(https?:\/\/)?(www\.)?/, '') // Remove protocol and www
        .split('?')[0] // Remove query parameters
        .split('#')[0] // Remove hash fragments
        .replace(/\/$/, '') // Remove trailing slash
        .toLowerCase(); // Convert to lowercase for case-insensitive comparison

      // Check for duplicate in existing entries
      const isDuplicate = entries.some(existingEntry => 
        existingEntry.value.toLowerCase() === cleanedEntry && 
        existingEntry.tenant === newEntry.tenant
      );

      // Also check for duplicates within the batch itself
      const isDuplicateInBatch = validEntries.some(validEntry => 
        validEntry.value.toLowerCase() === cleanedEntry && 
        validEntry.tenant === newEntry.tenant
      );

      if (isDuplicate || isDuplicateInBatch) {
        duplicateEntries.push(entry);
        continue;
      }

      // Validate IP address with CIDR notation
      const ipv4CidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
      const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$|^fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+$|^::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])$|^([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])$/;
      const ipv6CidrRegex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,7}:(\/\d{1,3})?|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}(\/\d{1,3})?$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})(\/\d{1,3})?$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)(\/\d{1,3})?$/;

      let isValidIP = false;
      if (ipv4CidrRegex.test(cleanedEntry)) {
        // Further validate IPv4 numbers and CIDR if present
        const [ipPart, cidrPart] = cleanedEntry.split('/');
        const ipNumbers = ipPart.split('.').map(num => parseInt(num));
        isValidIP = ipNumbers.every(num => num >= 0 && num <= 255);
        
        if (cidrPart) {
          const cidr = parseInt(cidrPart);
          isValidIP = isValidIP && (cidr >= 0 && cidr <= 32);
        }
      } else if (ipv6Regex.test(cleanedEntry) || ipv6CidrRegex.test(cleanedEntry)) {
        isValidIP = true;
        // Validate IPv6 CIDR if present
        if (cleanedEntry.includes('/')) {
          const cidr = parseInt(cleanedEntry.split('/')[1]);
          isValidIP = cidr >= 0 && cidr <= 128;
        }
      }

      const type = isValidIP ? 'IP' : (cleanedEntry.match(/\./) ? 'Domain' : null);

      if (type) {
        validEntries.push({
          type,
          value: cleanedEntry,
          blocked: newEntry.blocked,
          tenant: newEntry.tenant
        });
      } else {
        invalidEntries.push(entry);
      }
    }

    if (duplicateEntries.length > 0) {
      toast.error(`The following entries already exist for ${getProjectDisplayName(newEntry.tenant)}:\n${duplicateEntries.join('\n')}`);
      return;
    }

    if (invalidEntries.length > 0) {
      toast.error(`Invalid entries found: ${invalidEntries.join(', ')}`);
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    // Show loading toast
    const loadingToast = toast.loading(`Adding ${validEntries.length} entries...`);

    for (const entry of validEntries) {
      try {
        const result = await saveBlockedEntry(entry);
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        logger.error('Error adding entry:', error);
        failureCount++;
      }
    }

    // Dismiss loading toast
    toast.dismiss(loadingToast);

    // Show result toast
    if (successCount > 0) {
      toast.success(`Successfully added ${successCount} entries`);
    }
    if (failureCount > 0) {
      toast.error(`Failed to add ${failureCount} entries`);
    }

    setBatchEntries('');
    setIsBatchMode(false);
    setIsAddingEntry(false);
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      const newSelected = new Set(filteredEntries.map(entry => entry.id));
      setSelectedEntries(newSelected);
    } else {
      setSelectedEntries(new Set());
    }
  };

  // Handle individual select
  const handleSelectEntry = (id, checked) => {
    const newSelected = new Set(selectedEntries);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedEntries(newSelected);
  };

  // Bulk block entries
  const handleBulkBlock = async () => {
    const entriesToBlock = filteredEntries.filter(entry => 
      selectedEntries.has(entry.id) && !entry.blocked
    );

    if (entriesToBlock.length === 0) {
      toast.error('No entries selected or all selected entries are already blocked');
      return;
    }

    setActionModalConfig({
      title: 'Block Multiple Entries',
      message: `Are you sure you want to block ${entriesToBlock.length} selected entries?`,
      actionType: 'block',
      onConfirm: async () => {
        let successCount = 0;
        let failureCount = 0;

        // Show loading toast
        const loadingToast = toast.loading(`Blocking ${entriesToBlock.length} entries...`);

        for (const entry of entriesToBlock) {
          try {
            const result = await updateBlockedEntry(entry.id, { blocked: true });
            if (result.success) {
              successCount++;
            } else {
              failureCount++;
            }
          } catch (error) {
            logger.error('Error blocking entry:', error);
            failureCount++;
          }
        }

        // Dismiss loading toast
        toast.dismiss(loadingToast);

        // Show result toast
        if (successCount > 0) {
          toast.success(`Successfully blocked ${successCount} entries`);
        }
        if (failureCount > 0) {
          toast.error(`Failed to block ${failureCount} entries`);
        }

        // Clear selection
        setSelectedEntries(new Set());
        setActionModalOpen(false);
      }
    });
    setActionModalOpen(true);
  };

  // Export to CSV function
  const exportToCSV = () => {
    try {
      // Get the filtered and sorted entries
      const dataToExport = filteredEntries.map(entry => ({
        'Type': entry.type,
        'Value': entry.value,
        'Project': getProjectDisplayName(entry.tenant),
        'Status': entry.blocked ? 'Blocked' : 'Allowed',
        'Created At': entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '',
        'Updated At': entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : ''
      }));

      // Convert to CSV
      const headers = ['Type', 'Value', 'Project', 'Status', 'Created At', 'Updated At'];
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => 
          headers.map(header => {
            let cell = row[header] || '';
            // Escape commas and quotes
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
              cell = `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          }).join(',')
        )
      ].join('\n');

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `blocked_entries_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('CSV file exported successfully');
    } catch (error) {
      logger.error('Error exporting to CSV:', error);
      toast.error('Failed to export CSV file');
    }
  };

  // Update handleDeleteEntry function
  const handleDeleteEntry = async (id) => {
    setActionModalConfig({
        title: 'Delete Entry',
        message: 'Are you sure you want to delete this entry? This action cannot be undone.',
        actionType: 'delete',
        onConfirm: async () => {
            try {
                const result = await deleteBlockedEntry(id);
                if (result.success) {
                    toast.success('Entry deleted successfully');
                } else {
                    toast.error(result.error || 'Failed to delete entry');
                }
            } catch (error) {
                logger.error('Error deleting entry:', error);
                toast.error('Failed to delete entry');
            } finally {
                setActionModalOpen(false);
            }
        }
    });
    setActionModalOpen(true);
  };

  // Add edit entry function
  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setIsEditing(true);
  };

  // Add save edit function
  const handleSaveEdit = async () => {
    if (!editingEntry.value) {
      toast.error('Please enter a value');
      return;
    }

    // Validate IP address format if type is IP
    if (editingEntry.type === 'IP') {
      // IPv4 with CIDR regex
      const ipv4CidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
      // IPv6 regex (supports various formats including compressed and CIDR)
      const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$|^fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+$|^::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])$|^([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])$/;
      const ipv6CidrRegex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,7}:(\/\d{1,3})?|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}(\/\d{1,3})?$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}(\/\d{1,3})?$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})(\/\d{1,3})?$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)(\/\d{1,3})?$/;

      const isIPv4 = ipv4CidrRegex.test(editingEntry.value);
      const isIPv6 = ipv6Regex.test(editingEntry.value) || ipv6CidrRegex.test(editingEntry.value);

      if (!isIPv4 && !isIPv6) {
        toast.error('Invalid IP address format. Supported formats: IPv4, IPv4/CIDR, IPv6, or IPv6/CIDR');
        return;
      }
      
      // Validate IPv4 address numbers if it's an IPv4
      if (isIPv4) {
        const ipPart = editingEntry.value.split('/')[0];
        const ipNumbers = ipPart.split('.').map(num => parseInt(num));
        const isValidIP = ipNumbers.every(num => num >= 0 && num <= 255);
        
        if (!isValidIP) {
          toast.error('Invalid IPv4 address numbers. Each number must be between 0 and 255');
          return;
        }
        
        // If CIDR is present, validate it
        if (editingEntry.value.includes('/')) {
          const cidr = parseInt(editingEntry.value.split('/')[1]);
          if (cidr < 0 || cidr > 32) {
            toast.error('Invalid IPv4 CIDR notation. Must be between 0 and 32');
            return;
          }
        }
      }
      
      // Validate IPv6 CIDR if present
      if (isIPv6 && editingEntry.value.includes('/')) {
        const cidr = parseInt(editingEntry.value.split('/')[1]);
        if (cidr < 0 || cidr > 128) {
          toast.error('Invalid IPv6 CIDR notation. Must be between 0 and 128');
          return;
        }
      }
    }
    
    // Validate domain format if type is Domain
    if (editingEntry.type === 'Domain') {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9])*$/;
      if (!domainRegex.test(editingEntry.value)) {
        toast.error('Invalid domain format');
        return;
      }
    }

    // Check for duplicate entry
    const cleanedValue = editingEntry.value.trim().toLowerCase();
    const isDuplicate = entries.some(entry => 
      entry.id !== editingEntry.id && 
      entry.value.toLowerCase() === cleanedValue && 
      entry.tenant === editingEntry.tenant
    );

    if (isDuplicate) {
      toast.error(`This ${editingEntry.type} is already registered for ${getProjectDisplayName(editingEntry.tenant)}`);
      return;
    }

    try {
      setIsLoading(true);
      const result = await updateBlockedEntry(editingEntry.id, {
        value: editingEntry.value,
        tenant: editingEntry.tenant,
        type: editingEntry.type
      });
      
      if (result.success) {
        // Refresh the entries list
        const updatedEntries = await getBlockedEntries({ 
          type: filterType, 
          status: filterStatus, 
          tenant: filterTenant 
        });
        setEntries(updatedEntries);
        updateStats(updatedEntries);
        
        toast.success('Entry updated successfully');
        setIsEditing(false);
        setEditingEntry(null);
      } else {
        toast.error(result.error || 'Failed to update entry');
      }
    } catch (error) {
      logger.error('Error updating entry:', error);
      toast.error('Failed to update entry');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100">
      <Toaster position="top-right" />
      
      {/* Firebase Error Banner */}
      {hasFirebaseError && (
        <div className="bg-red-500/10 border-b border-red-500/20">
          <div className="max-w-7xl mx-auto p-4 flex items-center gap-3 text-red-400">
            <AlertCircle className="shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Connection Error</p>
              <p className="text-sm text-red-400/80">
                Unable to connect to the database. This might be caused by ad blockers or security extensions. 
                Please try:
              </p>
              <ul className="text-sm text-red-400/80 list-disc list-inside mt-1">
                <li>Disabling ad blockers for this site</li>
                <li>Allowing Firebase domains in your security settings</li>
                <li>Refreshing the page after making changes</li>
              </ul>
            </div>
            <button 
              onClick={refreshData}
              className="shrink-0 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-md text-red-400 flex items-center gap-1.5 text-sm border border-red-500/20 transition-all"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-cyan-950/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col md:flex-row justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent font-mono mb-3 md:mb-0">
            Network Threat Blocker
          </h1>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="px-3 py-1.5 bg-gray-800/70 hover:bg-gray-800 rounded-md text-emerald-400 flex items-center gap-1.5 text-sm border border-gray-700 transition-all"
            >
              <FileText size={16} />
              Export CSV
            </button>
            <button 
              onClick={refreshData} 
              className="px-3 py-1.5 bg-gray-800/70 hover:bg-gray-800 rounded-md text-cyan-400 flex items-center gap-1.5 text-sm border border-gray-700 transition-all"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {isLoading ? (
          <div className="min-h-[60vh] flex flex-col justify-center items-center">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-cyan-500 rounded-full animate-spin border-t-transparent"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-16 h-16 border-4 border-emerald-500 rounded-full animate-spin border-b-transparent"></div>
              </div>
            </div>
            <div className="text-center space-y-2 mt-6">
              <div className="text-cyan-500 font-mono text-lg animate-pulse">Loading Network Data</div>
              <div className="text-gray-400 text-sm font-mono">Analyzing IP's and DNS Entries...</div>
              <div className="flex space-x-2 justify-center">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-gray-800/40 border border-gray-700/50 rounded-lg flex flex-col">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Blocked IPs</div>
                <div className="text-2xl text-cyan-400 font-mono flex gap-2 items-center">
                  <Shield size={20} />
                  {statsData.blockedIPs}
                </div>
              </div>
              
              <div className="p-4 bg-gray-800/40 border border-gray-700/50 rounded-lg flex flex-col">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Blocked Domains</div>
                <div className="text-2xl text-cyan-400 font-mono flex gap-2 items-center">
                  <Globe size={20} />
                  {statsData.blockedDomains}
                </div>
              </div>
              
              <div className="p-4 bg-gray-800/40 border border-gray-700/50 rounded-lg flex flex-col">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Unblocked IPs</div>
                <div className="text-2xl text-cyan-400 font-mono flex gap-2 items-center">
                  <ShieldOff size={20} />
                  {statsData.unblockedIPs}
                </div>
              </div>
              
              <div className="p-4 bg-gray-800/40 border border-gray-700/50 rounded-lg flex flex-col">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Unblocked Domains</div>
                <div className="text-2xl text-cyan-400 font-mono flex gap-2 items-center">
                  <Globe size={20} />
                  {statsData.unblockedDomains}
                </div>
              </div>
            </div>
            
            {/* Search and Filter Bar */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search IP or domain..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800/30 border border-gray-700/50 rounded-md text-gray-300 placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all hover:bg-gray-800/50"
                />
              </div>
              
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="appearance-none pl-9 pr-10 py-2.5 bg-gray-800/30 border border-gray-700/50 rounded-md text-gray-300 font-mono focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all hover:bg-gray-800/50 cursor-pointer min-w-[140px]"
                >
                  <option value="ALL">All Types</option>
                  <option value="IP">IP Address</option>
                  <option value="Domain">Domain</option>
                </select>
                <Globe size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="appearance-none pl-9 pr-10 py-2.5 bg-gray-800/30 border border-gray-700/50 rounded-md text-gray-300 font-mono focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all hover:bg-gray-800/50 cursor-pointer min-w-[140px]"
                >
                  <option value="ALL">All Status</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="ALLOWED">Allowed</option>
                </select>
                <Shield size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={filterTenant}
                  onChange={(e) => setFilterTenant(e.target.value)}
                  className="appearance-none pl-9 pr-10 py-2.5 bg-gray-800/30 border border-gray-700/50 rounded-md text-gray-300 font-mono focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all hover:bg-gray-800/50 cursor-pointer min-w-[140px]"
                >
                  <option value="ALL">All Projects</option>
                  {PROJECT_OPTIONS.map(project => (
                    <option key={project.value} value={project.value}>
                      {project.label}
                    </option>
                  ))}
                </select>
                <Users size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              
              <button
                onClick={() => setIsAddingEntry(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-md font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
              >
                <Plus size={18} />
                Add New
              </button>
            </div>
            
            {/* Add New Entry Form */}
            {isAddingEntry && (
              <div className="mb-6 p-6 bg-gray-800/60 border border-gray-700/80 rounded-lg animate-fadeIn shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-cyan-400">Add New IP or DNS Entry</h2>
                  <div className="flex items-center gap-2">
                    {userRole !== 'trainee' && (
                      <button
                        onClick={() => setIsBatchMode(!isBatchMode)}
                        className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                          isBatchMode 
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
                            : 'bg-gray-700/50 text-gray-300 border border-gray-600/50 hover:bg-gray-700'
                        }`}
                      >
                        <FileText size={16} />
                        Batch Mode
                      </button>
                    )}
                    <button
                      onClick={() => setIsAddingEntry(false)}
                      className="p-1.5 hover:bg-gray-700/50 rounded-md text-gray-400 hover:text-gray-300 transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {!isBatchMode ? (
                  // Single Entry Mode
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-1">Type</label>
                      <select
                        value={newEntry.type}
                        onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                      >
                        <option value="IP">IP Address</option>
                        <option value="Domain">Domain</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 mb-1">Value</label>
                      <input
                        type="text"
                        placeholder="Enter IP or Domain"
                        value={newEntry.value}
                        onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 mb-1">Tenant</label>
                      <select
                        value={newEntry.tenant}
                        onChange={(e) => setNewEntry({ ...newEntry, tenant: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                      >
                        {PROJECT_OPTIONS.map(project => (
                          <option key={project.value} value={project.value}>
                            {project.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  // Batch Entry Mode
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-300 mb-1">Tenant</label>
                      <select
                        value={newEntry.tenant}
                        onChange={(e) => setNewEntry({ ...newEntry, tenant: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                      >
                        {PROJECT_OPTIONS.map(project => (
                          <option key={project.value} value={project.value}>
                            {project.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-gray-300">
                        <input
                          type="checkbox"
                          checked={newEntry.blocked}
                          onChange={(e) => setNewEntry({ ...newEntry, blocked: e.target.checked })}
                          className="rounded border-gray-700 text-cyan-500 focus:ring-cyan-500/50 bg-gray-900/80"
                        />
                        Set entries as blocked by default
                      </label>
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 mb-1">Enter Multiple IPs or Domains (one per line)</label>
                      <textarea
                        value={batchEntries}
                        onChange={(e) => setBatchEntries(e.target.value)}
                        placeholder="Enter IPs or domains (one per line)&#10;Example:&#10;192.168.1.1&#10;malicious-domain.com&#10;10.0.0.1&#10;another-domain.com"
                        className="w-full h-40 px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                      />
                      <p className="mt-2 text-sm text-gray-400">The system will automatically detect whether each entry is an IP or domain.</p>
                    </div>
                  </div>
                )}

                <div className="mt-4 text-right">
                  <button
                    onClick={isBatchMode ? handleBatchEntry : handleAddEntry}
                    className="px-5 py-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white rounded-md font-medium transition-all flex items-center gap-2 ml-auto"
                  >
                    <Plus size={18} />
                    {isBatchMode ? 'Add Batch' : 'Add Entry'}
                  </button>
                </div>
              </div>
            )}
            
            {/* Entries List */}
            <div className="bg-gray-800/50 border border-gray-700/80 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-medium text-cyan-400">IP & DNS Entries</h2>
                {selectedEntries.size > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleBulkBlock}
                      className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white rounded-md font-medium transition-all flex items-center gap-1.5"
                    >
                      <Shield size={16} />
                      Block Selected ({selectedEntries.size})
                    </button>
                  </div>
                )}
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="px-4 py-2">
                      <input
                        type="checkbox"
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        checked={filteredEntries.length > 0 && selectedEntries.size === filteredEntries.length}
                        className="rounded border-gray-700 text-cyan-500 focus:ring-cyan-500/50 bg-gray-900/80"
                      />
                    </th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Value</th>
                    <th className="px-4 py-2">Project</th>
                    <th className="px-4 py-2">Status</th>
                    <th 
                      className="px-4 py-2 cursor-pointer hover:text-cyan-400 transition-colors"
                      onClick={() => requestSort('createdAt')}
                    >
                      <div className="flex items-center gap-1">
                        Created At
                        {sortConfig.key === 'createdAt' && (
                          <ChevronDown 
                            size={16} 
                            className={`transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}
                          />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries
                    .slice(currentPage * 20, (currentPage + 1) * 20)
                    .map((entry) => {
                      const projectName = getProjectDisplayName(entry.tenant);
                      
                      return (
                        <tr key={entry.id} className="border-t border-gray-700">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selectedEntries.has(entry.id)}
                              onChange={(e) => handleSelectEntry(entry.id, e.target.checked)}
                              className="rounded border-gray-700 text-cyan-500 focus:ring-cyan-500/50 bg-gray-900/80"
                            />
                          </td>
                          <td className="px-4 py-2">{entry.type}</td>
                          <td className="px-4 py-2">{entry.value}</td>
                          <td className="px-4 py-2">{projectName}</td>
                          <td className="px-4 py-2">
                            {entry.blocked ? (
                              <span className="text-green-500">Blocked</span>
                            ) : (
                              <span className="text-red-500">Allowed</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-400 text-sm">
                            {entry.createdAt ? formatDate(entry.createdAt) : 'N/A'}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              {entry.blocked ? (
                                <button
                                  onClick={() => toggleBlockStatus(entry.id)}
                                  className="p-1.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-md transition-all"
                                >
                                  <ShieldOff size={16} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => toggleBlockStatus(entry.id)}
                                  className="p-1.5 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white rounded-md transition-all"
                                >
                                  <Shield size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => handleEditEntry(entry)}
                                className="p-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-md transition-all"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-1.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-md transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              <div className="flex justify-center items-center gap-4 p-4 border-t border-gray-700">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className={`px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors font-mono text-sm ${
                    currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Previous
                </button>
                <span className="text-gray-400 font-mono text-sm">
                  Page {currentPage + 1} of {Math.ceil(filteredEntries.length / 20)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredEntries.length / 20) - 1, prev + 1))}
                  disabled={currentPage >= Math.ceil(filteredEntries.length / 20) - 1}
                  className={`px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors font-mono text-sm ${
                    currentPage >= Math.ceil(filteredEntries.length / 20) - 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Action Confirmation Modal */}
      <ActionConfirmationModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        onConfirm={actionModalConfig.onConfirm}
        title={actionModalConfig.title}
        message={actionModalConfig.message}
        actionType={actionModalConfig.actionType}
      />

      {/* Edit Entry Modal */}
      {isEditing && editingEntry && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-900/75 backdrop-blur-sm"></div>
            </div>

            <div className="inline-block transform overflow-hidden rounded-lg bg-gray-800 px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 sm:mx-0 sm:h-10 sm:w-10">
                  <Edit2 className="h-6 w-6 text-cyan-400" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-200">
                    Edit Entry
                  </h3>
                  <div className="mt-2">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-300 mb-1">Type</label>
                        <select
                          value={editingEntry.type}
                          onChange={(e) => setEditingEntry({ ...editingEntry, type: e.target.value })}
                          disabled={isLoading}
                          className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="IP">IP Address</option>
                          <option value="Domain">Domain</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-gray-300 mb-1">Value</label>
                        <input
                          type="text"
                          value={editingEntry.value}
                          onChange={(e) => setEditingEntry({ ...editingEntry, value: e.target.value })}
                          disabled={isLoading}
                          className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-300 mb-1">Project</label>
                        <select
                          value={editingEntry.tenant}
                          onChange={(e) => setEditingEntry({ ...editingEntry, tenant: e.target.value })}
                          disabled={isLoading}
                          className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {PROJECT_OPTIONS.map(project => (
                            <option key={project.value} value={project.value}>
                              {project.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={isLoading}
                  className={`inline-flex w-full justify-center rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                    isLoading ? 'animate-pulse' : ''
                  }`}
                  onClick={handleSaveEdit}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  className="mt-3 inline-flex w-full justify-center rounded-lg bg-gray-700 px-4 py-2 text-base font-medium text-gray-300 shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingEntry(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}