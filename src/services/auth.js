import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  ApplicationVerifier,
  MultiFactorError,
  MultiFactorResolver,
  getMultiFactorResolver,
  sendEmailVerification,
  User
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { auth, firedb } from './firebase'
import { createActivityLog, ACTIVITY_CATEGORIES, ACTIVITY_ACTIONS } from './activityLog'
import { authStateManager } from '../utils/authStateManager'
import { logger } from '@/utils/logger'

// User roles
export const USER_ROLES = {
SUPER_ADMIN: 'super_admin',
CISO: 'ciso',
COO: 'coo',
ANALYST: 'analyst',
SPECIALIST: 'specialist',
TRAINEE: 'trainee'
};

// Role permissions
export const ROLE_PERMISSIONS = {
[USER_ROLES.SUPER_ADMIN]: ['manage_users', 'manage_roles', 'view_all', 'manage_settings'],
[USER_ROLES.CISO]: ['view_all', 'manage_settings'],
[USER_ROLES.COO]: ['view_all'],
[USER_ROLES.ANALYST]: ['view_reports', 'manage_alerts'],
[USER_ROLES.SPECIALIST]: ['view_reports', 'manage_alerts', 'manage_database'],
[USER_ROLES.TRAINEE]: ['view_reports', 'manage_alerts']
};

export const verifyIfUserIsEnrolled = (user) => {
const enrolledFactors = multiFactor(user).enrolledFactors;
return enrolledFactors.length > 0;
}

export const verifyPhoneNumber = async (
user,
phoneNumber,
recaptchaVerifier
) => {
try {
  // Get the current session
  const session = await multiFactor(user).getSession();
  
  // Create phone info options
  const phoneInfoOptions = {
    phoneNumber,
    session
  };

  // Create phone auth provider
  const phoneAuthProvider = new PhoneAuthProvider(auth);
  
  // Verify phone number and get verification ID
  const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
  
  if (verificationId) {
    // Update user document to indicate MFA setup in progress
    const userRef = doc(firedb, 'users', user.uid);
    await updateDoc(userRef, {
      mfaSetupInProgress: true,
      phoneNumber: phoneNumber
    });

    return verificationId;
  }
  return false;
} catch (error) {
  logger.error('Phone verification error:', error);
  return false;
}
}

export const enrollUser = async (
user,
verificationCodeId,
verificationCode
) => {
try {
  // Create phone auth credential
  const phoneAuthCredential = PhoneAuthProvider.credential(verificationCodeId, verificationCode);
  
  // Create multi-factor assertion
  const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);

  // Enroll the user with MFA
  await multiFactor(user).enroll(multiFactorAssertion, 'Personal Phone Number');

  // Update user document to indicate MFA is enabled
  const userRef = doc(firedb, 'users', user.uid);
  await updateDoc(userRef, {
    mfaEnabled: true,
    mfaSetupInProgress: false,
    mfaEnrolledAt: new Date().toISOString()
  });

  // Log successful MFA enrollment
  await createActivityLog({
    title: 'MFA Setup Complete',
    description: `User successfully set up MFA`,
    category: ACTIVITY_CATEGORIES.AUTH,
    action: ACTIVITY_ACTIONS.CREATE,
    details: {
      userId: user.uid,
      email: user.email,
      verificationMethod: 'phone',
      status: 'success'
    }
  });

  return true;
} catch (error) {
  logger.error('MFA enrollment error:', error);
  return false;
}
}

export const verifyUserMFA = async (
error,
recaptchaVerifier,
selectedIndex
) => {
try {
  // If error is a FirebaseError, use it directly
  if (error instanceof Error && error.code === 'auth/multi-factor-auth-required') {
    const resolver = getMultiFactorResolver(auth, error);

    if (resolver.hints[selectedIndex].factorId === PhoneMultiFactorGenerator.FACTOR_ID) {
      const phoneInfoOptions = {
        multiFactorHint: resolver.hints[selectedIndex],
        session: resolver.session
      }

      const phoneAuthProvider = new PhoneAuthProvider(auth);
      try {
        const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
        return { verificationId, resolver }
      } catch (e) {
        logger.error('Phone verification error:', e);
        return false
      }
    }
  }
  
  logger.error('Invalid MFA error object:', error);
  return false;
} catch (error) {
  logger.error('MFA resolver error:', error);
  return false;
}
}

export const verifyUserEnrolled = async (
verificationMFA,
verificationCode
) => {
const {verificationId, resolver} = verificationMFA;
const credentials = PhoneAuthProvider.credential(verificationId, verificationCode);
const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(credentials);

try {
  await resolver.resolveSignIn(multiFactorAssertion);
  
  // Log successful MFA verification
  await createActivityLog({
    title: 'MFA Verification',
    description: `User successfully verified MFA code`,
    category: ACTIVITY_CATEGORIES.AUTH,
    action: ACTIVITY_ACTIONS.LOGIN,
    details: {
      verificationMethod: 'phone',
      status: 'success'
    }
  });
  
  return true;
} catch (e) {
  return false;
}
}

export const verifyUserEmail = async (user) => {
try {
  await sendEmailVerification(user);
  return true;
} catch (e) {
  return false;
}
}

const configureGoogleProvider = () => {
  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    // Always prompt for account selection
    prompt: 'select_account',
    // Request minimal scope
    scope: 'email profile',
    // Add additional OAuth 2.0 scopes if needed
    access_type: 'online'
  });

  return provider;
};

export const signUpWithGoogle = async (role) => {
try {
  const provider = configureGoogleProvider();
  
  // Clear any existing auth state before starting
  authStateManager.clearState();
  
  const result = await signInWithPopup(auth, provider);
  
  // Get the state from the redirect result
  const credential = GoogleAuthProvider.credentialFromResult(result);
  
  if (!credential) {
    throw new Error('No credential received from Google');
  }

  const user = result.user;

  // Check if user already exists
  const userDoc = await getDoc(doc(firedb, 'users', user.uid));
  
  if (!userDoc.exists()) {
    // Create new user document with role and set status as pending
    await setDoc(doc(firedb, 'users', user.uid), {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: role,
      createdAt: new Date().toISOString(),
      status: 'pending',
      mfaEnabled: false
    });

    // Log the Google signup activity
    await createActivityLog({
      title: 'New User Registration',
      description: `User ${user.email} registered with Google`,
      category: ACTIVITY_CATEGORIES.AUTH,
      action: ACTIVITY_ACTIONS.CREATE,
      details: {
        email: user.email,
        role,
        method: 'google',
        status: 'pending'
      }
    });

    // Send email verification
    await verifyUserEmail(user);

    // Sign out the user since they need to wait for approval
    await signOut(auth);
    return { success: true, user, isNewUser: true, requiresApproval: true };
  }

  // Rest of the existing code...
  const userData = userDoc.data();
  if (userData.status !== 'approved') {
    await signOut(auth);
    return { success: false, error: 'account-pending-approval' };
  }

  await createActivityLog({
    title: 'User Login',
    description: `User ${user.email} logged in with Google`,
    category: ACTIVITY_CATEGORIES.AUTH,
    action: ACTIVITY_ACTIONS.LOGIN,
    details: {
      email: user.email,
      method: 'google'
    }
  });

  return { success: true, user, isNewUser: false };
} catch (error) {
  // Clean up auth state
  authStateManager.clearState();
  
  logger.error('Google sign up error:', error);
  
  let errorMessage = 'An error occurred during Google sign up';
  switch (error.code) {
    case 'auth/popup-closed-by-user':
      errorMessage = 'Sign up was cancelled';
      break;
    case 'auth/popup-blocked':
      errorMessage = 'Sign up popup was blocked. Please allow popups for this site';
      break;
    case 'auth/cancelled-popup-request':
      errorMessage = 'Another sign up request is in progress';
      break;
    case 'auth/account-exists-with-different-credential':
      errorMessage = 'An account already exists with the same email address but different sign-in credentials';
      break;
    case 'auth/invalid-credential':
      errorMessage = 'The authentication credential is invalid. Please try again.';
      break;
    default:
      errorMessage = error.message || 'Failed to sign up. Please try again.';
  }
  return { success: false, error: errorMessage };
}
};

export const signInWithGoogle = async () => {
try {
  const provider = configureGoogleProvider();
  const result = await signInWithPopup(auth, provider);
  
  // Clean URL after OAuth flow
  authStateManager.cleanUrl();

  // Verify state parameter
  const urlParams = new URLSearchParams(window.location.search);
  const returnedState = urlParams.get('state');
  
  if (!authStateManager.verifyState(returnedState)) {
    await signOut(auth);
    throw new Error('Invalid authentication state');
  }

  const user = result.user;

  // Check if user exists in our database
  const userDoc = await getDoc(doc(firedb, 'users', user.uid));
  
  if (!userDoc.exists()) {
    // Store the Google user info in sessionStorage temporarily
    sessionStorage.setItem('googleUserInfo', JSON.stringify({
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      uid: user.uid
    }));
    return { success: false, error: 'user-not-found' };
  }

  const userData = userDoc.data();
  if (userData.status !== 'approved') {
    return { success: false, error: 'account-pending' };
  }

  // Log the Google signin activity
  await createActivityLog({
    title: 'User Login',
    description: `User ${user.email} logged in with Google`,
    category: ACTIVITY_CATEGORIES.AUTH,
    action: ACTIVITY_ACTIONS.LOGIN,
    details: {
      email: user.email,
      method: 'google'
    }
  });

  return { success: true, user, mfaEnabled: false };
} catch (error) {
  // Clean up auth state
  authStateManager.clearState();
  
  logger.error('Google sign in error:', error);
  if (error instanceof Error && error.code === 'auth/multi-factor-auth-required') {
    return { 
      success: false, 
      error: error
    };
  }
  
  let errorMessage = 'An error occurred during Google sign in';
  switch (error.code) {
    case 'auth/popup-closed-by-user':
      errorMessage = 'Sign in was cancelled';
      break;
    case 'auth/popup-blocked':
      errorMessage = 'Sign in popup was blocked. Please allow popups for this site';
      break;
    case 'auth/cancelled-popup-request':
      errorMessage = 'Another sign in request is in progress';
      break;
    case 'auth/account-exists-with-different-credential':
      errorMessage = 'An account already exists with the same email address but different sign-in credentials';
      break;
    default:
      errorMessage = error.message || 'An unexpected error occurred';
  }
  return { success: false, error: errorMessage };
}
};

export const logOut = async () => {
  try {
    const currentUser = auth.currentUser
    const userEmail = currentUser?.email
    
    await signOut(auth)
    
    // Log the logout activity
    if (userEmail) {
      await createActivityLog({
        title: 'User Logout',
        description: `User ${userEmail} logged out`,
        category: ACTIVITY_CATEGORIES.AUTH,
        action: ACTIVITY_ACTIONS.LOGOUT,
        details: {
          email: userEmail
        }
      })
    }
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

const getAuthToken = async (username, password) => {
try {
  logger.info('Attempting authentication for user:', username);
  
  const response = await fetch('/api/stellar/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      username: username.trim(), 
      password: password.trim() 
    }),
  });

  logger.info('Auth response status:', response.status);

  const data = await response.json();
  logger.info('Auth response:', data);

  if (!response.ok) {
    throw new Error(data.error || 'Authentication failed');
  }

  if (!data.token) {
    throw new Error('No token received from authentication service');
  }

  return { 
    success: true, 
    token: data.token,
    exp: data.exp 
  };
} catch (error) {
  logger.error('Authentication error details:', error);
  return { 
    success: false, 
    error: error.message || 'Authentication failed'
  };
}
};

export { getAuthToken };

// Super admin functions
export const approveUser = async (userId, approvedBy) => {
try {
  const userRef = doc(firedb, 'users', userId)
  await updateDoc(userRef, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    approvedBy: approvedBy
  })

  // Log the approval activity
  await createActivityLog({
    title: 'User Approved',
    description: `User ${userId} was approved by ${approvedBy}`,
    category: ACTIVITY_CATEGORIES.AUTH,
    action: ACTIVITY_ACTIONS.UPDATE,
    details: {
      userId,
      approvedBy,
      status: 'approved'
    }
  })

  return { success: true }
} catch (error) {
  return { success: false, error: error.message }
}
}

export const declineUser = async (userId, declinedBy, reason) => {
try {
  const userRef = doc(firedb, 'users', userId)
  await updateDoc(userRef, {
    status: 'declined',
    declinedAt: new Date().toISOString(),
    declinedBy: declinedBy,
    declineReason: reason
  })

  // Log the decline activity
  await createActivityLog({
    title: 'User Declined',
    description: `User ${userId} was declined by ${declinedBy}`,
    category: ACTIVITY_CATEGORIES.AUTH,
    action: ACTIVITY_ACTIONS.UPDATE,
    details: {
      userId,
      declinedBy,
      reason,
      status: 'declined'
    }
  })

  return { success: true }
} catch (error) {
  return { success: false, error: error.message }
}
}

export const updateUserRole = async (userId, newRole, updatedBy) => {
try {
  const userRef = doc(firedb, 'users', userId);
  await updateDoc(userRef, {
    role: newRole,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy
  });

  // Log the role update activity
  await createActivityLog({
    title: 'User Role Updated',
    description: `User ${userId} role was updated to ${newRole} by ${updatedBy}`,
    category: ACTIVITY_CATEGORIES.AUTH,
    action: ACTIVITY_ACTIONS.UPDATE,
    details: {
      userId,
      newRole,
      updatedBy
    }
  });

  return { success: true };
} catch (error) {
  return { success: false, error: error.message };
}
};


export const getPendingUsers = async () => {
  try {
    const usersRef = collection(firedb, 'users')
    const q = query(usersRef, where('status', '==', 'pending'))
    const querySnapshot = await getDocs(q)
    
    const pendingUsers = []
    querySnapshot.forEach((doc) => {
      pendingUsers.push({ id: doc.id, ...doc.data() })
    })

    return { success: true, users: pendingUsers }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export const getAllUsers = async () => {
  try {
    const usersRef = collection(firedb, 'users')
    const querySnapshot = await getDocs(usersRef)
    
    const users = []
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() })
    })

    return { success: true, users }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Account management functions
export const disableUserAccount = async (userId, disabledBy) => {
  try {
    const userRef = doc(firedb, 'users', userId)
    await updateDoc(userRef, {
      disabled: true,
      disabledAt: new Date().toISOString(),
      disabledBy: disabledBy
    })

    // Log the disable activity
    await createActivityLog({
      title: 'User Account Disabled',
      description: `User ${userId} was disabled by ${disabledBy}`,
      category: ACTIVITY_CATEGORIES.AUTH,
      action: ACTIVITY_ACTIONS.UPDATE,
      details: {
        userId,
        disabledBy
      }
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export const enableUserAccount = async (userId, enabledBy) => {
  try {
    const userRef = doc(firedb, 'users', userId)
    await updateDoc(userRef, {
      disabled: false,
      enabledAt: new Date().toISOString(),
      enabledBy: enabledBy
    })

    // Log the enable activity
    await createActivityLog({
      title: 'User Account Enabled',
      description: `User ${userId} was enabled by ${enabledBy}`,
      category: ACTIVITY_CATEGORIES.AUTH,
      action: ACTIVITY_ACTIONS.UPDATE,
      details: {
        userId,
        enabledBy
      }
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export const deleteUserAccount = async (userId, deletedBy) => {
  try {
    const userRef = doc(firedb, 'users', userId)
    
    // First, get the user data for logging
    const userDoc = await getDoc(userRef)
    const userData = userDoc.data()
    
    // Delete the user document
    await deleteDoc(userRef)

    // Log the delete activity
    await createActivityLog({
      title: 'User Account Deleted',
      description: `User ${userId} (${userData.email}) was permanently deleted by ${deletedBy}`,
      category: ACTIVITY_CATEGORIES.AUTH,
      action: ACTIVITY_ACTIONS.DELETE,
      details: {
        userId,
        userEmail: userData.email,
        deletedBy
      }
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export const getUserStatus = async (userId) => {
  try {
    const userDoc = await getDoc(doc(firedb, 'users', userId))
    if (userDoc.exists()) {
      return userDoc.data().status || null
    }
    return null
  } catch (error) {
    logger.error('Error getting user status:', error)
    return null
  }
}

