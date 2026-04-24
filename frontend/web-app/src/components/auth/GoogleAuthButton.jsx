import React, { useEffect, useRef, useState } from 'react';

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

const GoogleAuthButton = ({ clientId, disabled = false, onCredential }) => {
    const callbackRef = useRef(onCredential);
    const [ready, setReady] = useState(Boolean(window.google?.accounts?.id));
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        callbackRef.current = onCredential;
    }, [onCredential]);

    useEffect(() => {
        if (!clientId) {
            return undefined;
        }

        const initializeGoogle = () => {
            if (!window.google?.accounts?.id) {
                return;
            }

            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: (response) => {
                    if (response?.credential) {
                        callbackRef.current(response.credential);
                    }
                },
            });
            setReady(true);
        };

        if (window.google?.accounts?.id) {
            initializeGoogle();
            return undefined;
        }

        let script = document.getElementById(GOOGLE_SCRIPT_ID);
        if (!script) {
            script = document.createElement('script');
            script.id = GOOGLE_SCRIPT_ID;
            script.src = GOOGLE_SCRIPT_SRC;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }

        script.addEventListener('load', initializeGoogle);

        return () => {
            script.removeEventListener('load', initializeGoogle);
        };
    }, [clientId]);

    if (!clientId) {
        return null;
    }

    const handleClick = () => {
        setLocalError('');

        if (!window.google?.accounts?.id) {
            setLocalError('Google sign in is still loading. Please try again.');
            return;
        }

        window.google.accounts.id.prompt();
    };

    return (
        <div className="grid grid-cols-1 gap-2">
            <button
                className="flex items-center justify-center gap-2 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 disabled:opacity-60"
                disabled={disabled || !ready}
                onClick={handleClick}
                type="button"
            >
                <img
                    alt=""
                    className="w-5 h-5"
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                />
                <span className="text-sm font-semibold">Continue with Google (Patients only)</span>
            </button>
            {localError && (
                <p className="text-xs text-red-600">{localError}</p>
            )}
        </div>
    );
};

export default GoogleAuthButton;
