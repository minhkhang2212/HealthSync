<?php

namespace App\Http\Controllers;

use App\Services\BookingService;
use App\Services\StripeCheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;

class StripeWebhookController extends Controller
{
    public function __construct(
        private readonly StripeCheckoutService $stripeCheckoutService,
        private readonly BookingService $bookingService,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        try {
            $event = $this->stripeCheckoutService->constructWebhookEvent($request);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 400);
        }

        try {
            $type = $event['type'] ?? null;
            $session = $event['data']['object'] ?? null;

            if (!is_string($type) || !is_array($session)) {
                return response()->json(['received' => true]);
            }

            if ($type === 'checkout.session.completed') {
                $this->bookingService->markStripeCheckoutCompleted(
                    (string) ($session['id'] ?? ''),
                    isset($session['payment_intent']) ? (string) $session['payment_intent'] : null
                );
            }

            if ($type === 'checkout.session.expired') {
                $this->bookingService->markStripeCheckoutExpired((string) ($session['id'] ?? ''));
            }
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Unable to process the Stripe event.',
            ], 500);
        }

        return response()->json(['received' => true]);
    }
}
