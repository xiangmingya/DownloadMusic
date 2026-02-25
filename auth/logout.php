<?php
require_once __DIR__ . '/session.php';

auth_logout();
header('Location: /index.php');
exit;

