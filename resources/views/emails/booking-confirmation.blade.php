<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Appointment Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">
    <p>Hi {{ $booking->patient?->name ?? 'Patient' }},</p>

    <p>Your appointment has been confirmed by {{ $booking->doctor?->name ?? 'your doctor' }}.</p>

    <p>
        Appointment date: {{ $appointmentDate }}<br>
        Appointment time: {{ $appointmentTime }}
    </p>

    <p>If your doctor included a file, it is attached to this email.</p>

    <p>Thank you,<br>HealthSync</p>
</body>
</html>
