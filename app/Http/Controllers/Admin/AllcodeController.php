<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Allcode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AllcodeController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|max:50',
            'key' => 'required|string|max:50',
            'valueEn' => 'required|string|max:255',
        ]);

        $allcode = Allcode::create($validated);

        return response()->json($allcode, 201);
    }

    public function update(int $id, Request $request): JsonResponse
    {
        $allcode = Allcode::find($id);
        if (!$allcode) {
            return response()->json(['message' => 'Allcode not found'], 404);
        }

        $validated = $request->validate([
            'type' => 'sometimes|string|max:50',
            'key' => 'sometimes|string|max:50',
            'valueEn' => 'sometimes|string|max:255',
        ]);

        $allcode->update($validated);

        return response()->json($allcode);
    }
}
