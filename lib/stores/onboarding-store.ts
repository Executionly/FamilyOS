import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type OnboardingStep = 'welcome' | 'add-members' | 'invite-coparent' | 'ready';

interface OnboardingState {
  // State
  currentStep: OnboardingStep;
  familyName: string;
  members: Array<{
    name: string;
    role: 'admin' | 'coparent' | 'member' | 'child' | string;
    age_band?: 'toddler' | 'child' | 'preteen' | 'teen' | 'adult' | string;
  }>;
  coparentEmail?: string;
  isCompleted: boolean;

  // Actions
  setFamilyName: (name: string) => void;
  addMember: (member: { name: string; role: 'admin' | 'coparent' | 'member' | 'child' | string; age_band?: 'toddler' | 'child' | 'preteen' | 'teen' | 'adult' | string }) => void;
  removeMember: (index: number) => void;
  setCoparentEmail: (email: string) => void;
  goToStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  completeOnboarding: () => void;
  reset: () => void;
}

const initialState = {
  currentStep: 'welcome' as OnboardingStep,
  familyName: '',
  members: [],
  coparentEmail: undefined,
  isCompleted: false,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,

  setFamilyName: (name: string) => {
    set({ familyName: name });
  },

  addMember: (member) => {
    set((state) => ({
      members: [...state.members, member],
    }));
  },

  removeMember: (index: number) => {
    set((state) => ({
      members: state.members.filter((_, i) => i !== index),
    }));
  },

  setCoparentEmail: (email: string) => {
    set({ coparentEmail: email });
  },

  goToStep: (step: OnboardingStep) => {
    set({ currentStep: step });
  },

  nextStep: () => {
    set((state) => {
      const steps: OnboardingStep[] = ['welcome', 'add-members', 'invite-coparent', 'ready'];
      const currentIndex = steps.indexOf(state.currentStep);
      const nextIndex = Math.min(currentIndex + 1, steps.length - 1);
      return { currentStep: steps[nextIndex] };
    });
  },

  completeOnboarding: () => {
    set({ isCompleted: true });
  },

  reset: () => {
    set(initialState);
  },
}));
