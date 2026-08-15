package com.zhuhao.haoshu

import android.os.Bundle
import android.view.ViewGroup
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // 采用 edge-to-edge（WebView 填满整个窗口），但由我们手动把系统栏的 inset
    // 作为 padding 加到内容根，确保 WebView 内容不会压在状态栏 / 导航栏之下。
    // 注意：仅 setDecorFitsSystemWindows(true) 在 Tauri 的 WebView 下不生效，
    // 因为 WebView 是 content 的 match_parent 子 View，框架的内缩 padding 没传导到它。
    WindowCompat.setDecorFitsSystemWindows(window, false)

    // 系统栏背景设为 App 浅色背景
    window.statusBarColor = 0xFFF5F6F8.toInt()
    window.navigationBarColor = 0xFFF5F6F8.toInt()

    // 浅色背景上的深色图标（先强制创建 DecorView，避免 onCreate 阶段 NPE）
    val decor = window.decorView
    val controller = WindowInsetsControllerCompat(window, decor)
    controller.isAppearanceLightStatusBars = true
    controller.isAppearanceLightNavigationBars = true

    // 把系统栏高度作为 padding 加到内容根（android.R.id.content），
    // WebView 是它的子 View，于是被推到系统栏之下，消除重叠。
    // 返回的 insets 不 consume，使 IME（软键盘）等 inset 仍能向下传递。
    val root = decor.findViewById<ViewGroup>(android.R.id.content)
    // 内缩留白区域用 App 浅色背景填充，避免露出深色窗口背景形成黑边
    root.setBackgroundColor(0xFFF5F6F8.toInt())
    ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      insets
    }
  }
}
