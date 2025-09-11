import { Audio } from 'expo-av';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface AudioContextType {
  sound: Audio.Sound | null;
  isPlaying: boolean;
  volume: number;
  isEnabled: boolean;
  playMusic: () => Promise<void>;
  pauseMusic: () => Promise<void>;
  stopMusic: () => Promise<void>;
  setVolume: (volume: number) => void;
  setEnabled: (enabled: boolean) => void;
  initializeMusic: () => Promise<void>;
  playVoiceover: () => Promise<void>;
  restartMusic: () => Promise<void>;
  voiceoverSound: Audio.Sound | null;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: React.ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [voiceoverSound, setVoiceoverSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.3);
  const [isEnabled, setIsEnabled] = useState(true);
  const isInitialized = useRef(false);

  const bgMusic = require('../assets/music/Kids Playing Funny Background Music For Videos.mp3');
  const voiceover = require('../assets/music/voiceover.mp3');

  const initializeMusic = async () => {
    if (isInitialized.current || sound) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(bgMusic, {
        shouldPlay: false,
        isLooping: true,
        volume: volume,
      });

      // Initialize voiceover sound
      const { sound: newVoiceoverSound } = await Audio.Sound.createAsync(voiceover, {
        shouldPlay: false,
        isLooping: false,
        volume: 0.8, // Voiceover volume
      });

      setSound(newSound);
      setVoiceoverSound(newVoiceoverSound);
      isInitialized.current = true;
    } catch (error) {
      console.log('Error initializing background music:', error);
    }
  };

  const playMusic = async () => {
    if (!sound || !isEnabled) return;

    try {
      if (!isPlaying) {
        // Ensure looping is set when playing
        await sound.setIsLoopingAsync(true);
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.log('Error playing music:', error);
    }
  };

  const pauseMusic = async () => {
    if (!sound) return;

    try {
      await sound.pauseAsync();
      setIsPlaying(false);
    } catch (error) {
      console.log('Error pausing music:', error);
    }
  };

  const stopMusic = async () => {
    if (!sound) return;

    try {
      await sound.stopAsync();
      setIsPlaying(false);
    } catch (error) {
      console.log('Error stopping music:', error);
    }
  };

  const setVolume = async (newVolume: number) => {
    setVolumeState(newVolume);
    if (sound) {
      try {
        await sound.setVolumeAsync(newVolume);
      } catch (error) {
        console.log('Error setting volume:', error);
      }
    }
  };

  const setEnabled = async (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      await pauseMusic();
    }
    // Note: When enabled=true, music will only play when explicitly called via playMusic()
  };

  const playVoiceover = async () => {
    if (!voiceoverSound) return;

    try {
      // Stop any currently playing voiceover
      await voiceoverSound.stopAsync();
      // Play the voiceover
      await voiceoverSound.playAsync();
    } catch (error) {
      console.log('Error playing voiceover:', error);
    }
  };

  const restartMusic = async () => {
    if (!sound || !isEnabled) return;

    try {
      await sound.stopAsync();
      await sound.setIsLoopingAsync(true);
      await sound.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.log('Error restarting music:', error);
    }
  };

  // Initialize music only when needed (not on mount)
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (voiceoverSound) {
        voiceoverSound.unloadAsync();
      }
    };
  }, []);

  // Set up event listener for when music finishes playing
  useEffect(() => {
    if (sound) {
      const onPlaybackStatusUpdate = (status: any) => {
        if (status.didJustFinish && isEnabled) {
          // Music finished playing, restart it to maintain loop
          restartMusic();
        }
      };

      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

      return () => {
        sound.setOnPlaybackStatusUpdate(null);
      };
    }
  }, [sound, isEnabled, restartMusic]);

  // Removed automatic music restart - music will only play when explicitly requested

  // Update volume when it changes
  useEffect(() => {
    if (sound) {
      sound.setVolumeAsync(volume);
    }
  }, [volume, sound]);

  const value: AudioContextType = {
    sound,
    isPlaying,
    volume,
    isEnabled,
    playMusic,
    pauseMusic,
    stopMusic,
    setVolume,
    setEnabled,
    initializeMusic,
    playVoiceover,
    restartMusic,
    voiceoverSound,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};
