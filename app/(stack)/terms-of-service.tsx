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

export default function TermsOfServiceScreen() {
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

  const labelBullet = (label: string, text: string) => (
    <View style={{ flexDirection: 'row', marginTop: 6 }}>
      <Text style={{ color: colors.muted, fontSize: 14, marginRight: 8 }}>•</Text>
      <Text style={{ flex: 1, fontSize: 14, color: colors.muted, lineHeight: 21 }}>
        <Text style={{ fontWeight: '700', color: colors.foreground }}>{label}: </Text>
        {text}
      </Text>
    </View>
  );

  const paragraph = (text: string) => (
    <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 22, marginTop: 8 }}>
      {text}
    </Text>
  );

  const legalBlock = (text: string) => (
    <View
      style={{
        backgroundColor: `${colors.error ?? '#DC2626'}0D`,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: `${colors.error ?? '#DC2626'}30`,
        padding: 12,
        marginTop: 8,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          color: colors.foreground,
          lineHeight: 19,
          fontWeight: '600',
          letterSpacing: 0.2,
        }}
      >
        {text}
      </Text>
    </View>
  );

  const emailLink = (
    <Pressable onPress={() => Linking.openURL('mailto:info@fambound.com')}>
      <Text style={{ color: colors.primary, fontWeight: '600' }}>info@fambound.com</Text>
    </Pressable>
  );

  const sections: Section[] = [
    {
      id: 'acceptance',
      title: '1. Acceptance of terms',
      icon: 'checkmark-circle-outline',
      content: paragraph(
        'By creating an account, accessing, or using Fambound, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the platform.'
      ),
    },
    {
      id: 'description',
      title: '2. Description of service',
      icon: 'apps-outline',
      content: paragraph(
        'Fambound provides a digital platform designed to help families connect, align values, build traditions, make decisions, and preserve legacy. The specific features and functionality may change over time as we improve the service.'
      ),
    },
    {
      id: 'eligibility',
      title: '3. Eligibility',
      icon: 'person-outline',
      content: paragraph(
        'You must be at least 18 years old to create an account and use Fambound. By creating an account, you represent that you meet this requirement.'
      ),
    },
    {
      id: 'account',
      title: '4. Account responsibilities',
      icon: 'key-outline',
      content: (
        <>
          {labelBullet('Accurate information', 'You agree to provide accurate, current, and complete information when creating your account.')}
          {labelBullet('Account security', 'You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.')}
          <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 21, marginTop: 6, marginLeft: 20 }}>
            <Text style={{ fontWeight: '700', color: colors.foreground }}>Notification: </Text>
            You agree to notify us immediately of any unauthorized use of your account at {emailLink}.
          </Text>
        </>
      ),
    },
    {
      id: 'acceptable-use',
      title: '5. Acceptable use',
      icon: 'ban-outline',
      content: (
        <>
          {paragraph('You agree not to use Fambound to:')}
          {bullet('Violate any applicable law or regulation.')}
          {bullet('Infringe on the intellectual property rights of others.')}
          {bullet('Post, upload, or transmit harmful, abusive, defamatory, or obscene content.')}
          {bullet("Attempt to gain unauthorized access to the platform, other users' accounts, or our systems.")}
          {bullet('Interfere with or disrupt the operation of the platform.')}
          {bullet('Use the platform to send spam or unsolicited communications.')}
          {bullet("Collect or harvest personal information of other users without consent.")}
        </>
      ),
    },
    {
      id: 'content',
      title: '6. User-generated content',
      icon: 'create-outline',
      content: (
        <>
          {labelBullet('Ownership', 'You retain ownership of the content you post on Fambound.')}
          {labelBullet('License', 'By posting content, you grant Fambound a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and display that content solely to operate and improve the platform.')}
          {labelBullet('Responsibility', "You are solely responsible for the content you post. Fambound is not responsible for user-generated content and does not endorse any user's views.")}
          {labelBullet('Removal', 'We reserve the right to remove any content that violates these Terms or that we deem inappropriate, without notice.')}
        </>
      ),
    },
    {
      id: 'ip',
      title: '7. Intellectual property',
      icon: 'ribbon-outline',
      content: (
        <>
          {labelBullet('Our IP', 'Fambound, the Fambound logo, and all platform content, features, and functionality are owned by Fambound and protected by copyright, trademark, and other intellectual property laws.')}
          {labelBullet('Limited license', 'We grant you a limited, non-exclusive, non-transferable license to use the platform for your personal, non-commercial family use.')}
          {labelBullet('Restrictions', 'You may not copy, modify, distribute, sell, or reverse-engineer any part of the platform without our prior written consent.')}
        </>
      ),
    },
    {
      id: 'payments',
      title: '8. Subscriptions and payments',
      icon: 'card-outline',
      content: (
        <>
          {labelBullet('Fees', 'If you purchase a subscription, you agree to pay all fees in the currency and amount specified at the time of purchase.')}
          {labelBullet('Billing', 'Fees are billed in advance on a recurring basis (monthly or annually) unless otherwise stated.')}
          {labelBullet('Auto-renewal', 'Subscriptions automatically renew until cancelled. You can cancel at any time through your account settings.')}
          {labelBullet('Refunds', '[Insert your refund policy]')}
          {labelBullet('Price changes', 'We may change fees with reasonable notice. Continued use after changes constitutes acceptance.')}
        </>
      ),
    },
    {
      id: 'termination',
      title: '9. Cancellation and termination',
      icon: 'exit-outline',
      content: (
        <>
          {labelBullet('By you', 'You may cancel your account at any time through your account settings or by contacting us.')}
          {labelBullet('By us', 'We may suspend or terminate your access if you violate these Terms, if required by law, or to protect the platform and its users.')}
          {labelBullet('Effect', 'Upon termination, your access ceases and we may delete your data in accordance with our Privacy Policy.')}
        </>
      ),
    },
    {
      id: 'warranty',
      title: '10. Disclaimer of warranties',
      icon: 'alert-circle-outline',
      content: (
        <>
          {legalBlock(
            'THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.'
          )}
          {legalBlock(
            'WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE FROM VIRUSES OR OTHER HARMFUL COMPONENTS.'
          )}
        </>
      ),
    },
    {
      id: 'liability',
      title: '11. Limitation of liability',
      icon: 'warning-outline',
      content: (
        <>
          {legalBlock(
            'TO THE MAXIMUM EXTENT PERMITTED BY LAW, FAMBOUND SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM.'
          )}
          {legalBlock(
            'OUR TOTAL LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THE PLATFORM SHALL NOT EXCEED THE GREATER OF: (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) $100.'
          )}
        </>
      ),
    },
    {
      id: 'indemnification',
      title: '12. Indemnification',
      icon: 'shield-outline',
      content: paragraph(
        "You agree to indemnify, defend, and hold harmless Fambound and its officers, directors, employees, and agents from any claims, damages, liabilities, and expenses (including reasonable attorneys' fees) arising out of your use of the platform, your content, or your violation of these Terms."
      ),
    },
    {
      id: 'third-party',
      title: '13. Third-party links',
      icon: 'link-outline',
      content: paragraph(
        'The platform may contain links to third-party websites or services. We are not responsible for the content, policies, or practices of third parties. Your use of third-party sites is at your own risk.'
      ),
    },
    {
      id: 'governing-law',
      title: '14. Governing law and dispute resolution',
      icon: 'scale-outline',
      content: (
        <>
          {labelBullet('Governing law', 'These Terms are governed by the laws of [Insert your state/country], without regard to conflict-of-law principles.')}
          {labelBullet('Dispute resolution', 'Any disputes shall be resolved through [binding arbitration / courts of [Insert jurisdiction]]. You agree to waive the right to a class action.')}
          {labelBullet('Severability', 'If any provision of these Terms is found unenforceable, the remaining provisions remain in full force.')}
        </>
      ),
    },
    {
      id: 'changes',
      title: '15. Changes to these terms',
      icon: 'refresh-outline',
      content: paragraph(
        'We may update these Terms from time to time. Material changes will be posted on this page with an updated "Last Updated" date. Continued use of the platform after changes constitutes acceptance.'
      ),
    },
  ];

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        {/* Header */}
        <AppHeader title='Terms of service' showBack/>

        <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
        >
            {/* Intro card */}
            <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
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
                Fambound terms of service
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                Last updated: [Insert date]
                </Text>
                <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 22, marginTop: 12 }}>
                Welcome to Fambound. By accessing or using our platform, you agree to be bound by
                these Terms of Service. Please read them carefully.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                <Ionicons name="mail-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 6 }}>
                    Questions about these terms? {emailLink}
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
                    sectionYPositions.current[section.id] = e.nativeEvent.layout.y + 260;
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
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginTop: 8 }}>
                Questions about these terms?
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