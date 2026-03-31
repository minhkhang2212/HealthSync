<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Services\Ai\AiTriageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class AiTriageController extends Controller
{
    public function __construct(
        private readonly AiTriageService $aiTriageService
    ) {}

    public function storeSession(Request $request): JsonResponse
    {
        try {
            return response()->json(
                $this->aiTriageService->createSession((int) $request->user()->id),
                201
            );
        } catch (HttpExceptionInterface $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], $exception->getStatusCode());
        }
    }

    public function storeMessage(int $sessionId, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|min:5|max:2000',
        ]);

        try {
            return response()->json(
                $this->aiTriageService->processUserMessage(
                    $sessionId,
                    (int) $request->user()->id,
                    $validated['message']
                )
            );
        } catch (HttpExceptionInterface $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], $exception->getStatusCode());
        }
    }
}
