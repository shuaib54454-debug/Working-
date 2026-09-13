package com.shuayb.recruitment.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = NavyPrimary,
    onPrimary = Color.White,
    primaryContainer = NavyLight,
    onPrimaryContainer = Color.White,
    secondary = GoldAccent,
    onSecondary = Color(0xFF221A00),
    secondaryContainer = Color(0xFFF7F0D8),
    onSecondaryContainer = Color(0xFF423400),
    background = BgCream,
    onBackground = TextPrimary,
    surface = SurfaceWhite,
    onSurface = TextPrimary,
    surfaceVariant = BgLightGray,
    onSurfaceVariant = TextSecondary,
    outline = BorderSubtle,
    outlineVariant = BorderStrong
)

private val DarkColorScheme = darkColorScheme(
    primary = GoldAccent,
    onPrimary = NavyDark,
    primaryContainer = NavyPrimary,
    onPrimaryContainer = Color.White,
    secondary = GoldLight,
    onSecondary = NavyDark,
    background = NavyDark,
    onBackground = Color(0xFFE2E8F0),
    surface = Color(0xFF132238),
    onSurface = Color(0xFFF1F5F9),
    surfaceVariant = Color(0xFF1E3250),
    onSurfaceVariant = Color(0xFF94A3B8),
    outline = Color(0xFF2A4365)
)

@Composable
fun ShuaybRecruitmentTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        content = content
    )
}
