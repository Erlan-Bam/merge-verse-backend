import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EmailService } from '../shared/services/email.service';

/**
 * Manual Email Test Script
 *
 * This script tests the email service by sending actual emails.
 * Use this to verify that your SMTP configuration is working correctly.
 *
 * Usage:
 *   npm run test:email
 *
 * Or run directly with ts-node:
 *   npx ts-node src/test/test-email.ts
 */

async function testEmailService() {
  console.log('🚀 Starting Email Service Test...\n');

  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule);
    const emailService = app.get(EmailService);

    // Test configuration
    const testEmail = process.env.TEST_EMAIL || 'erlanzh.gg@gmail.com';
    const testCode = '123456';
    const testAmount = 100.5;

    console.log(`📧 Test Email Address: ${testEmail}`);
    console.log(`🔢 Test Verification Code: ${testCode}`);
    console.log(`💰 Test Payout Amount: $${testAmount} USDT\n`);

    // Test 1: Send Verification Email
    console.log('📨 Test 1: Sending verification email...');
    try {
      await emailService.sendVerificationEmail(testEmail, testCode);
      console.log('✅ Verification email sent successfully!\n');
    } catch (error) {
      console.error('❌ Failed to send verification email:', error.message);
      console.error('   Error details:', error.stack || error);
      console.log('');
    }

    // Wait a bit before sending the next email
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test 2: Send Payout Code Email
    console.log('📨 Test 2: Sending payout code email...');
    try {
      await emailService.sendPayoutCodeEmail(testEmail, testCode, testAmount);
      console.log('✅ Payout code email sent successfully!\n');
    } catch (error) {
      console.error('❌ Failed to send payout code email:', error.message);
      console.error('   Error details:', error.stack || error);
      console.log('');
    }

    console.log('✨ Email service test completed!');
    console.log('\n📬 Please check your inbox at:', testEmail);
    console.log("   (Don't forget to check your spam folder)\n");

    // Close the application
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('💥 Critical error during test:', error);
    process.exit(1);
  }
}

// Run the test
testEmailService();
