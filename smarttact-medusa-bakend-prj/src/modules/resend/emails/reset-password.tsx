import {
  Text,
  Column,
  Container,
  Heading,
  Html,
  Link,
  Row,
  Section,
  Tailwind,
  Head,
  Preview,
  Body,
} from "@react-email/components"

type ResetPasswordEmailProps = {
  resetLink: string
  customerName?: string
}

function ResetPasswordEmail({ resetLink, customerName }: ResetPasswordEmailProps) {
  return (
    <Tailwind>
      <Html className="font-sans bg-gray-100">
        <Head />
        <Preview>Reset your password</Preview>
        <Body className="bg-white my-10 mx-auto w-full max-w-xl">
          {/* Header */}
          <Section className="bg-[#27272a] text-white px-6 py-4">
            <Heading className="text-white text-xl">Smarttract</Heading>
          </Section>

          {/* Reset Password Intro */}
          <Container className="p-6">
            <Heading className="text-2xl font-bold text-center text-gray-800">
              Reset your password{customerName ? `, ${customerName}` : ""}
            </Heading>
            <Text className="text-center text-gray-600 mt-2">
              We received a request to reset your password. Click the button below to choose a new password.
            </Text>
          </Container>

          {/* Reset Button */}
          <Container className="text-center px-6">
            <Link
              href={resetLink}
              className="inline-block bg-[#CCFF00] text-black font-semibold px-6 py-3 rounded-md mt-4 hover:bg-[#b3e600] transition-colors"
            >
              Reset Password
            </Link>
            <Text className="text-gray-500 text-sm mt-4">
              If you didn’t request a password reset, you can ignore this email.
            </Text>
          </Container>

          {/* Footer */}
          <Section className="bg-gray-50 p-6 mt-10">
            <Text className="text-center text-gray-500 text-sm">
              Need help? Contact us at support@smart-tract.com
            </Text>
            <Text className="text-center text-gray-400 text-xs mt-4">
              © {new Date().getFullYear()} Smarttract LLC. All rights reserved.
            </Text>
          </Section>
        </Body>
      </Html>
    </Tailwind>
  )
}

export const resetPasswordEmail = (props: ResetPasswordEmailProps) => (
  <ResetPasswordEmail {...props} />
)

const mockInput={
    resetLink:"https://smarttract-store.up.railway.app/us/reset-password?token=abc123&email=customer@example.com",
    customerName:"Alex"
}

export default () => <ResetPasswordEmail {...mockInput} />
