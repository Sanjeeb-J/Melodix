package com.sanjeeb.melodix.ui.components

import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.sanjeeb.melodix.ui.navigation.BottomNavItem

@Composable
fun BottomNavBar(selectedRoute: String, onSelect: (BottomNavItem) -> Unit) {
    val items = listOf(BottomNavItem.Home, BottomNavItem.Search, BottomNavItem.Library)
    NavigationBar {
        items.forEach { item ->
            NavigationBarItem(
                selected = selectedRoute == item.route,
                onClick = { onSelect(item) },
                icon = { Icon(item.icon, contentDescription = item.label) },
                label = { Text(item.label) },
            )
        }
    }
}
