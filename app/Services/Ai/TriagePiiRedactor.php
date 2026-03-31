<?php

namespace App\Services\Ai;

class TriagePiiRedactor
{
    public function redact(string $message): string
    {
        $normalized = trim($message);

        if ($normalized === '') {
            return '';
        }

        $normalized = preg_replace(
            '/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i',
            '[redacted-email]',
            $normalized
        ) ?? $normalized;

        $normalized = preg_replace(
            '/(?<!\w)(?:\+?\d[\d\s().-]{6,}\d)(?!\w)/',
            '[redacted-phone]',
            $normalized
        ) ?? $normalized;

        return $normalized;
    }
}
