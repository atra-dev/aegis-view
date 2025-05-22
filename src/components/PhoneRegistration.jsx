import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chat, Flag, Phone } from 'phosphor-react';

export function PhoneRegistration({ getPhoneNumber }) {
    const router = useRouter();
    const phoneNumber = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isValid, setIsValid] = useState(false);

    const validatePhoneNumber = (value) => {
        const phoneRegex = /^\+63[0-9]{10}$/;
        return phoneRegex.test(value);
    };

    async function handleClick() {
        if (phoneNumber.current) {
            const value = phoneNumber.current.value;
            if (!value.startsWith('+63')) {
                setError('Please enter a valid Philippine phone number starting with +63');
                setIsValid(false);
                return;
            }
            if (!validatePhoneNumber(value)) {
                setError('Please enter a valid Philippine phone number (e.g., +639123456789)');
                setIsValid(false);
                return;
            }
            
            setIsLoading(true);
            setError('');
            try {
                await getPhoneNumber(value);
                setIsValid(true);
            } finally {
                setIsLoading(false);
            }
        }
    }

    return (
        <div className="max-w-md w-full space-y-8 p-8 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90 rounded-2xl border border-cyan-500/30 backdrop-blur-xl shadow-2xl shadow-cyan-500/20 relative z-10 overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 animate-gradient-xy"></div>
                <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 50% 50%, rgba(0, 255, 255, 0.1) 0%, transparent 50%)`,
                    animation: 'pulse 4s ease-in-out infinite'
                }}></div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>

            {/* Animated particles */}
            <div className="absolute inset-0">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `float ${5 + Math.random() * 10}s infinite`,
                            animationDelay: `${Math.random() * 5}s`,
                            opacity: 0.2
                        }}
                    />
                ))}
            </div>

            {/* Content */}
            <div className="relative z-10">
                <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                        <div className="bg-gray-900/90 p-3 rounded-full border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
                            <Phone weight='fill' className='w-8 h-8 text-cyan-400'/>
                        </div>
                    </div>
                    <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-mono">
                        Phone Verification
                    </h2>
                    <p className="mt-3 text-sm text-cyan-500/70 font-mono">
                        Enter your Philippine phone number to receive a verification code
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-cyan-500/20"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <div className="bg-gray-900/90 p-2 rounded-full border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
                                <Flag weight='fill' className='w-6 h-6 text-cyan-400'/>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                            <span className="text-cyan-400 font-mono text-lg">+63</span>
                        </div>
                        <input
                            ref={phoneNumber}
                            type="tel"
                            required
                            defaultValue="+63"
                            placeholder="9123456789"
                            className={`w-full py-3 pl-20 pr-4 text-lg font-mono bg-gray-900/50 border-2 rounded-xl text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-200 transform hover:scale-[1.02] ${isValid ? 'border-green-500/50' : error ? 'border-red-500/50' : 'border-cyan-500/30'}`}
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm font-mono bg-red-400/10 p-3 rounded-xl border border-red-400/20 flex items-center space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex-1 py-3 px-4 text-sm font-medium rounded-xl text-cyan-300 bg-transparent hover:bg-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500/50 font-mono border border-cyan-500/30 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleClick}
                            disabled={isLoading}
                            className="flex-1 py-3 px-4 text-sm font-medium rounded-xl text-cyan-300 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500/50 font-mono border border-cyan-500/30 disabled:opacity-50 transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <svg className="animate-spin h-5 w-5 text-cyan-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Sending...</span>
                                </div>
                            ) : (
                                'Send SMS'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    25% { transform: translateY(-10px) translateX(5px); }
                    50% { transform: translateY(0) translateX(10px); }
                    75% { transform: translateY(10px) translateX(5px); }
                }
                @keyframes gradient-xy {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    );
} 