import { useState, useEffect } from 'react';

type UseOtpCountdownOptions = {
  expiresAt?: string | null;
  durationSeconds?: number;
};

export function useOtpCountdown({
  expiresAt,
  durationSeconds = 300,
}: UseOtpCountdownOptions = {}) {
  const computeSecondsLeft = () => {
    if (expiresAt) {
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      return Math.max(0, Math.floor(diffMs / 1000));
    }
    return durationSeconds;
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(computeSecondsLeft);

  useEffect(() => {
    setSecondsLeft(computeSecondsLeft());
  }, [expiresAt, durationSeconds]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, durationSeconds]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpired = secondsLeft <= 0;

  return {
    secondsLeft,
    formattedTime,
    isExpired,
  };
}
