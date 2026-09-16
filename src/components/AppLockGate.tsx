import React, { useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { APP_LOCK_CHANGED_EVENT, isAppLockEnabled, authenticateToUnlock, isNativeApp } from "../lib/appLock";
import { AppLockScreen } from "./AppLockScreen";
import { AppLockControl } from "./AppLockControl";

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

    const lockChangedListener = () => setLocked(false);
    window.addEventListener(APP_LOCK_CHANGED_EVENT, lockChangedListener);

    return () => {
      void resumeListener.then((listener) => listener.remove());
      window.removeEventListener(APP_LOCK_CHANGED_EVENT, lockChangedListener);
    };
  }, []);

  if (locked) {
    return <AppLockScreen onUnlocked={() => setLocked(false)} />;
  }

  return (
    <>
      {children}
      <AppLockControl />
    </>
  );
};
