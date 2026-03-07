<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Allcode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AllcodeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'nullable|string|max:50',
            'key' => 'nullable|string|max:50',
        ]);

        $query = Allcode::query()->orderBy('type')->orderBy('key');

        if (!empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        if (!empty($validated['key'])) {
            $query->where('key', $validated['key']);
        }

        return response()->json($query->get());
    }
}
