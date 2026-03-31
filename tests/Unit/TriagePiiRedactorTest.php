<?php

namespace Tests\Unit;

use App\Services\Ai\TriagePiiRedactor;
use PHPUnit\Framework\TestCase;

class TriagePiiRedactorTest extends TestCase
{
    public function test_it_redacts_phone_numbers_and_email_addresses(): void
    {
        $redactor = new TriagePiiRedactor();

        $redacted = $redactor->redact('My email is patient@example.com and my phone is +44 7700 900123.');

        $this->assertStringContainsString('[redacted-email]', $redacted);
        $this->assertStringContainsString('[redacted-phone]', $redacted);
        $this->assertStringNotContainsString('patient@example.com', $redacted);
        $this->assertStringNotContainsString('7700 900123', $redacted);
    }
}
