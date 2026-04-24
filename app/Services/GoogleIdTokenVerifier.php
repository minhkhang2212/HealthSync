<?php

namespace App\Services;

use Google\Client;

class GoogleIdTokenVerifier
{
    /**
     * @return array<string, mixed>|false
     */
    public function verify(string $credential, string $clientId): array|false
    {
        $client = new Client(['client_id' => $clientId]);

        return $client->verifyIdToken($credential);
    }
}
