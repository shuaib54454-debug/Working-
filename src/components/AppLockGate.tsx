import React, { useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { isAppLockEnabled, authenticateToUnlock, isNativeApp } from "../lib/appLock";
import { AppLockScreen } from "./AppLockScreen";

const APP_LOCK_CHANGED_EVENT = "shuayb:app-lock-changed";

export const AppLockGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locked, setLocked] = useState(() => isNativeApp() && isAppLockEnabled());

  useEffect(() => {
    if (!isNativeApp()) return;

    const unlockOnStartup = async () => {
      if (!isAppLockEnabled()) {
        setLocked(false);
        return;
      }

      setLocked(true);
      const unlocked = await authenticateToUnlock();
      setLocked(!unlocked);
    };

    void unlockOnStartup();

    const resumeListener = CapApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive || !isAppLockEnabled()) return;
      setLocked(true);
      void authenticateToUnlock().then((unlocked) => setLocked(!unlocked));
    });

    const lockChangedListener = () => {
      if (!isAppLockEnabled()) {
        setLocked(false);
      } else {
        // Enabling is authenticated by SettingsView before this event is emitted.
        setLocked(false);
      }
    };

    window.addEventListener(APP_LOCK_CHANGED_EVENT, lockChangedListener);

    return () => {
      void resumeListener.then((listener) => listener.remove());
      window.removeEventListener(APP_LOCK_CHANGED_EVENT, lockChangedListener);
    };
  }, []);

  if (locked) {
    return <AppLockScreen onUnlocked={() => setLocked(false)} />;
  }

  return <>{children}</>;
};

export const APP_LOCK_CHANGED_EVENT_NAME = APP_LOCK_CHANGED_EVENT;
