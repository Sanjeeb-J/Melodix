package com.sanjeeb.melodix.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val MelodixTypography = Typography(
    titleLarge = Typography().titleLarge.copy(fontSize = 24.sp, fontWeight = FontWeight.Bold),
    titleMedium = Typography().titleMedium.copy(fontSize = 20.sp, fontWeight = FontWeight.Bold),
    bodyLarge = Typography().bodyLarge.copy(fontSize = 16.sp),
    bodyMedium = Typography().bodyMedium.copy(fontSize = 14.sp),
    labelMedium = Typography().labelMedium.copy(fontSize = 13.sp, fontWeight = FontWeight.Medium),
    labelSmall = Typography().labelSmall.copy(fontSize = 11.sp),
)
