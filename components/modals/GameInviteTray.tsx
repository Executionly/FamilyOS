import { useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { RelativePathString, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-colors';
import { useGameInviteStore } from '@/lib/stores/game-invite-store';
import { GAME_META } from '@/constants/games';

const INVITE_SOUND = require('../../assets/sounds/game-invite.wav');

export function GameInviteTray() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { invites, dismissInvite } = useGameInviteStore();

  const previousInviteIds = useRef<Set<string>>(new Set());

  const player = useAudioPlayer(INVITE_SOUND);

  useEffect(() => {
    const currentInviteIds = new Set(
      invites.map((invite) => invite.sessionId)
    );

    const hasNewInvite = invites.some(
      (invite) => !previousInviteIds.current.has(invite.sessionId)
    );

    if (hasNewInvite) {
      try {
        player.volume = 0.9;
        player.seekTo(0);
        player.play();
      } catch (error) {
        console.warn('Unable to play game invite sound:', error);
      }
    }

    previousInviteIds.current = currentInviteIds;
  }, [invites, player]);

  if (invites.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + 12,
        left: 0,
        right: 0,
        zIndex: 999,
      }}
      className="px-4"
    >
      {invites.map((invite) => {
        const meta = GAME_META[invite.gameType];
        const isFeud = invite.gameType === 'family_feud';
        const isTd = invite.gameType === 'truth_dare';

        const route =
          `/(stack)/games/${
            isFeud ? 'feud/feud-lobby' 
            : isTd ? 'truth-dare/truth-dare-lobby' 
            : 'lobby'
          }?sessionId=${invite.sessionId}` as RelativePathString;

        return (
          <View
            key={invite.sessionId}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.16,
              shadowRadius: 18,
              elevation: 8,
            }}
            className="mb-3 overflow-hidden rounded-3xl border"
          >
            <View
              style={{ backgroundColor: meta.color }}
              className="h-1.5 w-full"
            />

            <View className="p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View
                    style={{
                      backgroundColor: `${meta.color}18`,
                      borderColor: `${meta.color}35`,
                    }}
                    className="mr-3 h-12 w-12 items-center justify-center rounded-2xl border"
                  >
                    <Ionicons
                      name={meta.icon}
                      size={23}
                      color={meta.color}
                    />
                  </View>

                  <View>
                    <Text
                      style={{ color: meta.color }}
                      className="text-[10px] font-extrabold uppercase tracking-[1.5px]"
                    >
                      Incoming invite
                    </Text>

                    <Text className="mt-1 text-base font-extrabold text-foreground">
                      {meta.label}
                    </Text>
                  </View>
                </View>

                <Pressable
                  accessibilityLabel="Dismiss game invitation"
                  onPress={() => dismissInvite(invite.sessionId)}
                  style={{ backgroundColor: colors.background }}
                  className="h-8 w-8 items-center justify-center rounded-full"
                >
                  <Ionicons
                    name="close"
                    size={17}
                    color={colors.muted}
                  />
                </Pressable>
              </View>

              <View
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                }}
                className="mb-4 rounded-2xl border px-3.5 py-3"
              >
                <View className="flex-row items-center">
                  <View
                    style={{ backgroundColor: `${meta.color}22` }}
                    className="mr-2.5 h-7 w-7 items-center justify-center rounded-full"
                  >
                    <Ionicons
                      name="person"
                      size={14}
                      color={meta.color}
                    />
                  </View>

                  <Text className="flex-1 text-sm text-muted">
                    <Text className="font-bold text-foreground">
                      {invite.hostName}
                    </Text>{' '}
                    invited you to play
                  </Text>

                  <View
                    style={{ backgroundColor: `${meta.color}18` }}
                    className="rounded-full px-2.5 py-1"
                  >
                    <Text
                      style={{ color: meta.color }}
                      className="text-[10px] font-bold uppercase"
                    >
                      Multiplayer
                    </Text>
                  </View>
                </View>
              </View>

              <View className="flex-row items-center">
                <Pressable
                  onPress={() => dismissInvite(invite.sessionId)}
                  style={{ borderColor: colors.border }}
                  className="mr-2.5 flex-1 items-center justify-center rounded-2xl border py-3"
                >
                  <Text className="text-sm font-bold text-muted">
                    Decline
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    dismissInvite(invite.sessionId);
                    router.push(route);
                  }}
                  style={{ backgroundColor: colors.primary }}
                  className="flex-[1.4] flex-row items-center justify-center rounded-2xl py-3"
                >
                  <Text className="mr-2 text-sm font-extrabold text-white">
                    Join game
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}