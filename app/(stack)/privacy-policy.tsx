import React, { useRef } from 'react';
import { ScrollView, Text, View, Pressable, Linking } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/app-header';

type Section = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  content: React.ReactNode;
};

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const sectionYPositions = useRef<Record<string, number>>({});

  const scrollToSection = (id: string) => {
    const y = sectionYPositions.current[id];
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y: y - 12, animated: true });
    }
  };

  const bullet = (text: string) => (
    <View style={{ flexDirection: 'row', marginTop: 6 }}>
      <Text style={{ color: colors.muted, fontSize: 14, marginRight: 8 }}>•</Text>
      <Text style={{ flex: 1, fontSize: 14, color: colors.muted, lineHeight: 21 }}>{text}</Text>
    </View>
  );

  const paragraph = (text: string) => (
    <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 22, marginTop: 8 }}>
      {text}
    </Text>
  );

  const subheading = (text: string) => (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '700',
        color: colors.foreground,
        marginTop: 14,
        marginBottom: 2,
      }}
    >
      {text}
    </Text>
  );

  const emailLink = (
    <Pressable onPress={() => Linking.openURL('mailto:info@fambound.com')}>
      <Text style={{ color: colors.primary, fontWeight: '600' }}>info@fambound.com</Text>
    </Pressable>
  );

  const sections: Section[] = [
    {
      id: 'collect',
      title: '1. Information we collect',
      icon: 'document-text-outline',
      content: (
        <>
          {subheading('Information you provide to us')}
          {bullet('Account information — name, email address, password, and profile details when you create an account.')}
          {bullet('Family profile information — names, relationships, and preferences you voluntarily add about your family members.')}
          {bullet('Payment information — billing details are collected through our payment processor; we do not store full credit card numbers.')}
          {bullet('Communications — messages, feedback, and support requests you send to us.')}
          {subheading('Information collected automatically')}
          {bullet('Usage data — pages visited, time spent, features used, and interactions with the platform.')}
          {bullet('Device data — IP address, browser type, operating system, and device identifiers.')}
          {bullet('Cookies and similar technologies — used to remember preferences, analyze traffic, and improve functionality.')}
        </>
      ),
    },
    {
      id: 'use',
      title: '2. How we use your information',
      icon: 'cog-outline',
      content: (
        <>
          {bullet('Provide and improve our services — operate the platform, personalize your experience, and develop new features.')}
          {bullet('Communicate with you — send account notifications, service updates, and respond to your requests.')}
          {bullet('Process payments — complete transactions you authorize.')}
          {bullet('Ensure security — detect, prevent, and address fraud, abuse, and technical issues.')}
          {bullet('Comply with legal obligations — meet requirements under applicable law.')}
        </>
      ),
    },
    {
      id: 'share',
      title: '3. How we share your information',
      icon: 'share-social-outline',
      content: (
        <>
          {paragraph('We do not sell your personal information. We share information only in these limited circumstances:')}
          {bullet('Service providers — trusted vendors who help us operate the platform (hosting, payment processing, analytics, email delivery), bound by confidentiality obligations.')}
          {bullet('Legal compliance — when required by law, regulation, or legal process.')}
          {bullet('Business transfers — in connection with a merger, acquisition, or sale of assets; we will notify you of any change in ownership.')}
          {bullet('With your consent — when you explicitly authorize us to share specific information.')}
        </>
      ),
    },
    {
      id: 'security',
      title: '4. Data security',
      icon: 'shield-checkmark-outline',
      content: paragraph(
        'We implement reasonable technical and organizational measures to protect your personal information, including encryption in transit, secure data storage, and access controls. No method of transmission over the internet is 100% secure — we cannot guarantee absolute security.'
      ),
    },
    {
      id: 'retention',
      title: '5. Data retention',
      icon: 'time-outline',
      content: paragraph(
        'We retain your personal information only as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. When data is no longer needed, we delete or anonymize it.'
      ),
    },
    {
      id: 'rights',
      title: '6. Your rights and choices',
      icon: 'person-outline',
      content: (
        <>
          {paragraph('Depending on your location, you may have the right to:')}
          {bullet('Access the personal information we hold about you.')}
          {bullet('Correct inaccurate or incomplete information.')}
          {bullet('Delete your personal information (subject to legal retention requirements).')}
          {bullet('Restrict or object to certain processing activities.')}
          {bullet('Data portability — receive your data in a structured, machine-readable format.')}
          {bullet('Withdraw consent at any time where processing is based on consent.')}
          <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 22, marginTop: 10 }}>
            To exercise any of these rights, email {emailLink}. We will respond within 30 days.
          </Text>
        </>
      ),
    },
    {
      id: 'cookies',
      title: '7. Cookies and tracking',
      icon: 'ellipse-outline',
      content: (
        <>
          {paragraph('We use cookies and similar technologies to:')}
          {bullet('Remember your preferences and login status.')}
          {bullet('Analyze how users interact with the platform.')}
          {bullet('Improve performance and user experience.')}
          {paragraph('You can control cookies through your browser settings. Disabling cookies may affect certain features of the platform.')}
        </>
      ),
    },
    {
      id: 'children',
      title: "8. Children's privacy",
      icon: 'happy-outline',
      content: paragraph(
        'Fambound is designed for families, but our platform is intended for use by adults (18+). We do not knowingly collect personal information from children under 13 without verifiable parental consent. If you believe a child has provided us personal information, contact us and we will delete it.'
      ),
    },
    {
      id: 'transfers',
      title: '9. International data transfers',
      icon: 'globe-outline',
      content: paragraph(
        'If you access Fambound from outside the United States, your information may be transferred to and processed in the United States or other countries where we or our service providers operate. By using the platform, you consent to these transfers.'
      ),
    },
    {
      id: 'ccpa',
      title: '10. California privacy rights (CCPA/CPRA)',
      icon: 'flag-outline',
      content: (
        <>
          {paragraph('If you are a California resident, you have the right to:')}
          {bullet('Know what personal information we collect, use, and share.')}
          {bullet('Request deletion of your personal information.')}
          {bullet('Opt out of the "sale" or "sharing" of personal information — we do not sell your data.')}
          {bullet('Non-discrimination — we will not deny you services for exercising your privacy rights.')}
        </>
      ),
    },
    {
      id: 'gdpr',
      title: '11. GDPR rights (EU/EEA residents)',
      icon: 'earth-outline',
      content: (
        <>
          {paragraph('If you are located in the European Economic Area, you have rights under the GDPR, including:')}
          {bullet('Right of access — obtain a copy of your personal data.')}
          {bullet('Right to rectification — correct inaccurate data.')}
          {bullet('Right to erasure ("right to be forgotten") — request deletion.')}
          {bullet('Right to restrict processing — limit how we use your data.')}
          {bullet('Right to data portability — receive your data in a usable format.')}
          {bullet('Right to object — object to processing based on legitimate interests.')}
          {paragraph('Legal basis for processing: we process personal data based on your consent, contract performance, legal obligations, and legitimate interests.')}
        </>
      ),
    },
    {
      id: 'changes',
      title: '12. Changes to this policy',
      icon: 'refresh-outline',
      content: paragraph(
        'We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the "Last Updated" date. Continued use of the platform after changes constitutes acceptance.'
      ),
    },
  ];

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      {/* Header */}
      <AppHeader title='Privacy policy' showBack/>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro card */}
        <View style={{ paddingHorizontal: 20, paddingTop: 5 }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 18,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>
              Fambound privacy policy
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
              Last updated: [Insert date]
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 22, marginTop: 12 }}>
              We ("Fambound", "we", "our", "us") respect your privacy and are committed to
              protecting the personal information you share with us. This policy explains what
              we collect, how we use it, and the choices you have.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <Ionicons name="mail-outline" size={16} color={colors.primary} />
              <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 6 }}>
                Privacy questions? {emailLink}
              </Text>
            </View>
          </View>

          {/* Quick jump index */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.muted,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              Jump to a section
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {sections.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => scrollToSection(s.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: `${colors.primary}12`,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                    {s.title.replace(/^\d+\.\s*/, '')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Sections */}
          {sections.map((section) => (
            <View
              key={section.id}
              onLayout={(e) => {
                sectionYPositions.current[section.id] = e.nativeEvent.layout.y + 260; // offset for intro/index cards above
              }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 18,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: `${colors.primary}14`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <Ionicons name={section.icon} size={17} color={colors.primary} />
                </View>
                <Text
                  style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.foreground }}
                >
                  {section.title}
                </Text>
              </View>
              <View style={{ marginLeft: 42 }}>{section.content}</View>
            </View>
          ))}

          {/* Contact footer */}
          <View
            style={{
              backgroundColor: `${colors.primary}0D`,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: `${colors.primary}30`,
              padding: 18,
              marginTop: 8,
              alignItems: 'center',
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: colors.foreground,
                marginTop: 8,
              }}
            >
              Questions about this policy?
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.muted,
                textAlign: 'center',
                marginTop: 4,
                marginBottom: 10,
              }}
            >
              Reach out anytime — we're happy to help.
            </Text>
            <Pressable
              onPress={() => Linking.openURL('mailto:info@fambound.com')}
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                Email info@fambound.com
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}