import { useColors } from "@/hooks/use-colors";


export type MemberRole = 'admin'  | 'mother' | 'father' | 'member' | 'child' | string;
export type AgeBand = 'toddler' | 'child' | 'preteen' | 'teen' | 'adult' | string;

export const PRESET_ROLES: MemberRole[] = ['admin', 'mother', 'father', 'member', 'child'];
export const PRESET_AGE_BANDS: AgeBand[] = ['toddler', 'child', 'preteen', 'teen', 'adult'];

export function isAdminAccess(role?: string): boolean{
    if(!role) return false
    const userRole = role?.toLowerCase()
    switch (userRole) {
        case "admin":
        case "father":
        case "mother":
        case "coparent":
            return true
        default:
            return false
    }
}

export function getConversationId(userIdA: string, userIdB: string): string {
    return [userIdA, userIdB].sort().join('::');
}

export const markdownStyles = (colors: ReturnType<typeof useColors>, size = 16) => ({
  body: { color: colors.foreground, fontSize: size },
  strong: { fontWeight: '700' as const, color: colors.foreground },
  em: { fontStyle: 'italic' as const },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  paragraph: { marginTop: 0, marginBottom: 4 },
  code_inline: { backgroundColor: colors.border, borderRadius: 4, paddingHorizontal: 4 },
});