import { useEffect, useState } from "react";

export function useTimer(isRunning: boolean) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  function resetTimer() {
    setSeconds(0);
  }

  function formatTime(): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return {
    seconds,
    formattedTime: formatTime(),
    resetTimer,
  };
}