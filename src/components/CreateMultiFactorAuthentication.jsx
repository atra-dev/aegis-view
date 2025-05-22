import { useState } from 'react';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { PhoneRegistration } from '@/components/PhoneRegistration';
import { verifyPhoneNumber } from '@/services/auth';
import toast from 'react-hot-toast';

export function CreateMultiFactorAuthentication({ currentUser }) {
    const recaptcha = useRecaptcha('sign-up');
    const [verificationCodeId, setVerificationCodeId] = useState(null);

    async function getPhoneNumber(phoneNumber) {
        if (!currentUser || !recaptcha) {
            return;
        }

        try {
            const verificationId = await verifyPhoneNumber(
                currentUser,
                phoneNumber,
                recaptcha
            );

            if (!verificationId) {
                toast.error('Something went wrong. Please try again.');
            } else {
                setVerificationCodeId(verificationId);
                toast.success('Verification code sent!');
            }
        } catch (error) {
            toast.error('Failed to send verification code. Please try again.');
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
            {!verificationCodeId ? (
                <PhoneRegistration getPhoneNumber={getPhoneNumber} />
            ) : (
                <CodeSignIn
                    verificationId={verificationCodeId}
                    currentUser={currentUser}
                />
            )}
            <div id="sign-up"></div>
        </div>
    );
} 