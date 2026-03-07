<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'roleId' => 'nullable|string|max:20',
            'search' => 'nullable|string|max:255',
            'paginate' => 'nullable|boolean',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = User::query();

        if (!empty($validated['roleId'])) {
            $query->where('roleId', $validated['roleId']);
        }

        if (!empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phoneNumber', 'like', "%{$search}%");
            });
        }

        if (($validated['paginate'] ?? false) === true) {
            $perPage = $validated['per_page'] ?? 15;
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->get());
    }
}
