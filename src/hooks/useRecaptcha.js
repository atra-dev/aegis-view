'use client'

import { useEffect, useState } from "react";
import { RecaptchaVerifier } from "firebase/auth";
import { auth } from "@/services/firebase";

export function useRecaptcha(componentId) {
    const [recaptcha, setRecaptcha] = useState(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const verifier = new RecaptchaVerifier(auth, componentId, {
            size: "invisible",
            callback: () => {}
        });

        setRecaptcha(verifier);

        return () => {
            verifier.clear();
        };
    }, [componentId]);

    return recaptcha;
} 