<?php

namespace App\Support;

use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class RevenueReportPdfBuilder
{
    public static function build(
        string $monthLabel,
        int $recognizedRevenueAmount,
        string $currency,
        iterable $entries,
        CarbonInterface $generatedAt
    ): string {
        $collection = $entries instanceof Collection ? $entries : collect($entries);
        $blocks = [];

        self::pushWrappedLine($blocks, 'HealthSync Revenue Report', 18);
        self::pushBlankLine($blocks);
        self::pushWrappedLine($blocks, sprintf('Reporting month: %s', $monthLabel), 12);
        self::pushWrappedLine($blocks, sprintf(
            'Recognized revenue: %s',
            self::formatMinorCurrency($recognizedRevenueAmount, $currency)
        ));
        self::pushWrappedLine($blocks, sprintf('Paid bookings: %d', $collection->count()));
        self::pushWrappedLine($blocks, sprintf(
            'Generated at: %s',
            $generatedAt->copy()->timezone('Europe/London')->format('Y-m-d H:i T')
        ));
        self::pushBlankLine($blocks);
        self::pushWrappedLine($blocks, 'Bookings included in this report', 14);
        self::pushBlankLine($blocks);

        if ($collection->isEmpty()) {
            self::pushWrappedLine($blocks, 'No paid bookings were recognized in this month.');
        } else {
            foreach ($collection as $booking) {
                $patientLabel = self::formatActorLabel(
                    $booking->patientId ?? null,
                    $booking->patient?->name ?? null,
                    'Patient'
                );
                $doctorLabel = self::formatActorLabel(
                    $booking->doctorId ?? null,
                    $booking->doctor?->name ?? null,
                    'Doctor'
                );
                $paidAt = $booking->paidAt
                    ? $booking->paidAt->copy()->timezone('Europe/London')->format('Y-m-d')
                    : '--';
                $appointmentDate = $booking->date ?: '--';
                $paymentMethod = strtoupper((string) ($booking->paymentMethod ?: 'unknown'));
                $amount = self::formatMinorCurrency((int) ($booking->paymentAmount ?? 0), $booking->paymentCurrency ?: $currency);

                self::pushWrappedLine($blocks, sprintf(
                    'Booking #%s | Paid %s | Appointment %s | %s',
                    $booking->id ?? '--',
                    $paidAt,
                    $appointmentDate,
                    $amount
                ));
                self::pushWrappedLine($blocks, sprintf(
                    '%s | %s | Method: %s',
                    $patientLabel,
                    $doctorLabel,
                    $paymentMethod
                ));
                self::pushBlankLine($blocks);
            }
        }

        return self::buildPdf(self::paginateBlocks($blocks));
    }

    private static function formatMinorCurrency(int $amount, string $currency): string
    {
        $currencyCode = strtoupper((string) ($currency ?: 'gbp'));
        $majorAmount = $amount / 100;

        return sprintf(
            '%s %s',
            $currencyCode,
            number_format($majorAmount, 2, '.', ',')
        );
    }

    private static function formatActorLabel(mixed $id, ?string $name, string $prefix): string
    {
        $normalizedName = self::normalizeText($name ?: 'Unknown');
        if ($normalizedName === '') {
            $normalizedName = 'Unknown';
        }

        $trimmedName = self::truncate($normalizedName, 36);
        $identifier = $id === null ? '--' : (string) $id;

        return sprintf('%s %s: %s', $prefix, $identifier, $trimmedName);
    }

    private static function pushBlankLine(array &$blocks): void
    {
        $blocks[] = ['text' => ' ', 'size' => 12];
    }

    private static function pushWrappedLine(array &$blocks, string $text, int $size = 12): void
    {
        $normalizedText = self::normalizeText($text);
        $maxChars = $size >= 18 ? 56 : ($size >= 14 ? 74 : 94);
        $lines = self::wrapText($normalizedText, $maxChars);

        foreach ($lines as $line) {
            $blocks[] = [
                'text' => $line,
                'size' => $size,
            ];
        }
    }

    private static function normalizeText(string $text): string
    {
        $singleLine = preg_replace('/\s+/u', ' ', trim($text)) ?? '';
        if ($singleLine === '') {
            return '';
        }

        $transliterated = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $singleLine);
        if ($transliterated === false || $transliterated === '') {
            $transliterated = $singleLine;
        }

        return preg_replace('/[^\x20-\x7E]/', '', $transliterated) ?? '';
    }

    private static function truncate(string $text, int $maxLength): string
    {
        if (strlen($text) <= $maxLength) {
            return $text;
        }

        return rtrim(substr($text, 0, $maxLength - 3)) . '...';
    }

    private static function wrapText(string $text, int $maxChars): array
    {
        if ($text === '') {
            return [' '];
        }

        $words = preg_split('/\s+/', $text) ?: [];
        $lines = [];
        $currentLine = '';

        foreach ($words as $word) {
            if ($word === '') {
                continue;
            }

            $candidate = $currentLine === '' ? $word : sprintf('%s %s', $currentLine, $word);
            if (strlen($candidate) <= $maxChars) {
                $currentLine = $candidate;
                continue;
            }

            if ($currentLine !== '') {
                $lines[] = $currentLine;
            }

            while (strlen($word) > $maxChars) {
                $lines[] = substr($word, 0, $maxChars);
                $word = substr($word, $maxChars);
            }

            $currentLine = $word;
        }

        if ($currentLine !== '') {
            $lines[] = $currentLine;
        }

        return $lines === [] ? [' '] : $lines;
    }

    private static function paginateBlocks(array $blocks): array
    {
        $pages = [];
        $currentPage = [];
        $currentHeight = 0;
        $pageHeight = 740;

        foreach ($blocks as $block) {
            $lineHeight = self::lineHeight((int) ($block['size'] ?? 12));

            if ($currentPage !== [] && $currentHeight + $lineHeight > $pageHeight) {
                $pages[] = $currentPage;
                $currentPage = [];
                $currentHeight = 0;
            }

            $currentPage[] = $block;
            $currentHeight += $lineHeight;
        }

        if ($currentPage !== []) {
            $pages[] = $currentPage;
        }

        return $pages === [] ? [[['text' => ' ', 'size' => 12]]] : $pages;
    }

    private static function lineHeight(int $size): int
    {
        return match (true) {
            $size >= 18 => 28,
            $size >= 14 => 22,
            default => 16,
        };
    }

    private static function buildPdf(array $pages): string
    {
        $objects = [
            1 => '<< /Type /Catalog /Pages 2 0 R >>',
            3 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];

        $pageObjectNumbers = [];
        $contentObjectNumbers = [];
        $nextObjectNumber = 4;

        foreach ($pages as $_page) {
            $pageObjectNumbers[] = $nextObjectNumber++;
            $contentObjectNumbers[] = $nextObjectNumber++;
        }

        $objects[2] = sprintf(
            '<< /Type /Pages /Count %d /Kids [ %s ] >>',
            count($pageObjectNumbers),
            implode(' ', array_map(fn (int $number) => sprintf('%d 0 R', $number), $pageObjectNumbers))
        );

        foreach ($pages as $index => $page) {
            $pageObjectNumber = $pageObjectNumbers[$index];
            $contentObjectNumber = $contentObjectNumbers[$index];
            $contentStream = self::buildContentStream($page);

            $objects[$pageObjectNumber] = sprintf(
                '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>',
                $contentObjectNumber
            );
            $objects[$contentObjectNumber] = sprintf(
                "<< /Length %d >>\nstream\n%s\nendstream",
                strlen($contentStream),
                $contentStream
            );
        }

        ksort($objects);

        $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        $offsets = [0];

        foreach ($objects as $number => $body) {
            $offsets[$number] = strlen($pdf);
            $pdf .= sprintf("%d 0 obj\n%s\nendobj\n", $number, $body);
        }

        $maxObjectNumber = max(array_keys($objects));
        $xrefOffset = strlen($pdf);

        $pdf .= sprintf("xref\n0 %d\n", $maxObjectNumber + 1);
        $pdf .= "0000000000 65535 f \n";

        for ($index = 1; $index <= $maxObjectNumber; $index++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$index] ?? 0);
        }

        $pdf .= sprintf(
            "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF",
            $maxObjectNumber + 1,
            $xrefOffset
        );

        return $pdf;
    }

    private static function buildContentStream(array $page): string
    {
        $commands = ['BT'];
        $currentY = 792;

        foreach ($page as $line) {
            $size = (int) ($line['size'] ?? 12);
            $text = self::escapePdfText((string) ($line['text'] ?? ' '));

            $commands[] = sprintf('/F1 %d Tf', $size);
            $commands[] = sprintf('1 0 0 1 50 %d Tm', $currentY);
            $commands[] = sprintf('(%s) Tj', $text);

            $currentY -= self::lineHeight($size);
        }

        $commands[] = 'ET';

        return implode("\n", $commands);
    }

    private static function escapePdfText(string $text): string
    {
        return str_replace(
            ['\\', '(', ')'],
            ['\\\\', '\(', '\)'],
            $text
        );
    }
}
