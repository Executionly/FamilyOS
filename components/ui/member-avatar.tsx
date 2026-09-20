import { useColors } from "@/hooks/use-colors";
import { Member, useFamilyStore } from "@/lib/stores/family-store";
import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";

const avatarUrlCache = new Map<string, string>();
export function MemberAvatar({ member, colors, selected }: { 
  member: Member; 
  colors: ReturnType<typeof useColors>;
  selected?: boolean
}) {
  const { getAvatarSignedUrl } = useFamilyStore();
  const [signedUrl, setSignedUrl] = useState<string | null>(
    member.avatar_url ? avatarUrlCache.get(member.avatar_url) ?? null : null
  );

  useEffect(() => {
    let cancelled = false;
    if (!member.avatar_url) {
      setSignedUrl(null);
      return;
    }
    const cached = avatarUrlCache.get(member.avatar_url);
    if (cached) {
      setSignedUrl(cached);
      return;
    }
    getAvatarSignedUrl(member.avatar_url).then((url) => {
      if (url) avatarUrlCache.set(member.avatar_url!, url);
      if (!cancelled) setSignedUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [member.avatar_url, getAvatarSignedUrl]);

  return (
    signedUrl ? (
      <Image
        source={{ uri: signedUrl }}
        className="w-9 h-9 rounded-full mr-2.5"
      />
    ) : (
      <View
        style={{
          backgroundColor: selected ? "rgba(255,255,255,0.2)" : colors.border,
        }}
        className="w-9 h-9 rounded-full items-center justify-center mr-2.5"
      >
        <Text
          style={{ color: selected ? colors.background : colors.foreground }}
          className="font-bold text-xs"
        >
          {member.name ? member.name.slice(0, 2).toUpperCase() : ""}
        </Text>
      </View>
    )
  );
}