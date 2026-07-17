import { Platform, Vibration } from 'react-native';
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
  type AVPlaybackStatus,
} from 'expo-av';
import * as Haptics from 'expo-haptics';

/** Ringtone + vibration play window, then pause until the next cycle. */
export const ALERT_RING_MS = 15_000;
export const ALERT_CYCLE_MS = 45_000;

/** Android: pause, vibrate, pause, vibrate — repeats during each burst */
const ANDROID_PATTERN = [0, 450, 250, 450];
const IOS_PULSE_MS = 2400;

const BOOKING_REQUEST_SOUND = require('../../assets/sounds/booking-request.wav');

let active = false;
let cycleTimer: ReturnType<typeof setInterval> | null = null;
let burstStopTimer: ReturnType<typeof setTimeout> | null = null;
let iosPulseTimer: ReturnType<typeof setInterval> | null = null;
let sound: Audio.Sound | null = null;
let soundReady: Promise<void> | null = null;

async function iosPulse() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // Simulator or unsupported device
  }
}

function clearBurstVibration() {
  if (iosPulseTimer) {
    clearInterval(iosPulseTimer);
    iosPulseTimer = null;
  }
  Vibration.cancel();
}

function clearBurstStopTimer() {
  if (burstStopTimer) {
    clearTimeout(burstStopTimer);
    burstStopTimer = null;
  }
}

async function ensureSound() {
  if (sound) return;
  if (soundReady) return soundReady;

  soundReady = (async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const { sound: created } = await Audio.Sound.createAsync(BOOKING_REQUEST_SOUND, {
      isLooping: true,
      volume: 1,
      shouldPlay: false,
    });
    sound = created;
  })();

  return soundReady;
}

async function startRingtone() {
  if (Platform.OS === 'web') return;

  try {
    await ensureSound();
    if (!sound) return;
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // Missing asset, simulator, or audio unavailable
  }
}

async function stopRingtone() {
  try {
    if (sound) {
      const status = (await sound.getStatusAsync()) as AVPlaybackStatus;
      if (status.isLoaded && status.isPlaying) {
        await sound.stopAsync();
      }
    }
  } catch {
    // Ignore
  }
}

function startVibrationBurst() {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    Vibration.vibrate(ANDROID_PATTERN, true);
    return;
  }

  void iosPulse();
  iosPulseTimer = setInterval(() => void iosPulse(), IOS_PULSE_MS);
}

function stopAlertBurst() {
  clearBurstStopTimer();
  clearBurstVibration();
  void stopRingtone();
}

async function runAlertBurst() {
  stopAlertBurst();
  void startRingtone();
  startVibrationBurst();

  burstStopTimer = setTimeout(() => {
    stopAlertBurst();
  }, ALERT_RING_MS);
}

export function syncPendingRequestVibration(shouldVibrate: boolean) {
  if (Platform.OS === 'web') return;

  if (shouldVibrate) {
    if (active) return;
    active = true;

    void runAlertBurst();
    cycleTimer = setInterval(() => {
      void runAlertBurst();
    }, ALERT_CYCLE_MS);
    return;
  }

  stopPendingRequestVibration();
}

export function stopPendingRequestVibration() {
  if (Platform.OS === 'web') return;

  active = false;

  if (cycleTimer) {
    clearInterval(cycleTimer);
    cycleTimer = null;
  }

  stopAlertBurst();
}

/** Stop alert ringtone/vibration and give short success feedback when a request is accepted. */
export async function vibrateBookingAccepted() {
  if (Platform.OS === 'web') return;

  stopPendingRequestVibration();

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics unavailable
  }

  if (Platform.OS === 'android') {
    try {
      Vibration.vibrate(180);
    } catch {
      // Ignore
    }
  }
}
