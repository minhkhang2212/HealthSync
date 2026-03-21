<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class StripeCheckoutService
{
    private const API_BASE_URL = 'https://api.stripe.com/v1';

    public function isConfigured(): bool
    {
        return filled(config('services.stripe.secret_key'));
    }

    public function createCheckoutSession(array $payload): array
    {
        $secretKey = (string) config('services.stripe.secret_key');
        if ($secretKey === '') {
            throw new RuntimeException('Stripe is not configured. Add STRIPE_SECRET_KEY before enabling online payments.');
        }

        $response = Http::withBasicAuth($secretKey, '')
            ->asForm()
            ->post(self::API_BASE_URL . '/checkout/sessions', $payload);

        return $this->parseStripeResponse($response);
    }

    public function expireCheckoutSession(string $sessionId): void
    {
        $secretKey = (string) config('services.stripe.secret_key');
        if ($secretKey === '' || $sessionId === '') {
            return;
        }

        $response = Http::withBasicAuth($secretKey, '')
            ->asForm()
            ->post(self::API_BASE_URL . "/checkout/sessions/{$sessionId}/expire");

        if ($response->failed() && $response->status() !== 400) {
            $this->parseStripeResponse($response);
        }
    }

    public function constructWebhookEvent(Request $request): array
    {
        $payload = $request->getContent();
        $signatureHeader = (string) $request->header('Stripe-Signature');
        $webhookSecret = (string) config('services.stripe.webhook_secret');

        if ($payload === '' || $signatureHeader === '' || $webhookSecret === '') {
            throw new RuntimeException('Missing Stripe webhook payload or secret.');
        }

        [$timestamp, $signatures] = $this->parseSignatureHeader($signatureHeader);
        $tolerance = (int) config('services.stripe.webhook_tolerance', 300);

        if ($timestamp <= 0 || empty($signatures)) {
            throw new RuntimeException('Invalid Stripe signature header.');
        }

        if ($tolerance > 0 && abs(Carbon::now()->timestamp - $timestamp) > $tolerance) {
            throw new RuntimeException('Stripe webhook timestamp is outside the allowed tolerance.');
        }

        $signedPayload = "{$timestamp}.{$payload}";
        $expectedSignature = hash_hmac('sha256', $signedPayload, $webhookSecret);
        $isValid = collect($signatures)->contains(
            fn (string $signature): bool => hash_equals($expectedSignature, $signature)
        );

        if (!$isValid) {
            throw new RuntimeException('Invalid Stripe webhook signature.');
        }

        $decoded = json_decode($payload, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Unable to decode Stripe webhook payload.');
        }

        return $decoded;
    }

    private function parseSignatureHeader(string $header): array
    {
        $timestamp = 0;
        $signatures = [];

        foreach (explode(',', $header) as $segment) {
            [$key, $value] = array_pad(explode('=', trim($segment), 2), 2, null);

            if ($key === 't') {
                $timestamp = (int) $value;
            }

            if ($key === 'v1' && is_string($value) && $value !== '') {
                $signatures[] = $value;
            }
        }

        return [$timestamp, $signatures];
    }

    private function parseStripeResponse(Response $response): array
    {
        if ($response->successful()) {
            $decoded = $response->json();
            if (is_array($decoded)) {
                return $decoded;
            }

            throw new RuntimeException('Stripe returned an unexpected response.');
        }

        $message = $response->json('error.message');
        if (!is_string($message) || trim($message) === '') {
            $message = 'Stripe request failed.';
        }

        throw new RuntimeException($message);
    }
}
