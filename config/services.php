<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'frontend' => [
        'url' => env('FRONTEND_URL', env('APP_URL', 'http://localhost')),
    ],

    'stripe' => [
        'secret_key' => env('STRIPE_SECRET_KEY'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'webhook_tolerance' => (int) env('STRIPE_WEBHOOK_TOLERANCE', 300),
    ],

    'ai_triage' => [
        'enabled' => filter_var(env('AI_TRIAGE_ENABLED', false), FILTER_VALIDATE_BOOL),
        'provider' => env('AI_TRIAGE_PROVIDER', 'openai'),
        'base_url' => env('AI_TRIAGE_BASE_URL', 'https://api.openai.com/v1'),
        'api_key' => env('AI_TRIAGE_API_KEY', env('OPENAI_API_KEY')),
        'model' => env('AI_TRIAGE_MODEL', 'gpt-4.1-mini'),
        'timeout' => (int) env('AI_TRIAGE_TIMEOUT', 25),
    ],

];
