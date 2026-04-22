import { useCallback, useEffect, useState } from 'react'

const EMPTY_PERMISSION = {
  checked: false,
  granted: false,
  supported: false,
  canPrompt: false,
  platform: '',
  openTarget: 'privacy',
  label: '',
  message: '',
}

export function usePermissions() {
  const [platform, setPlatform] = useState('')
  const [screenRecording, setScreenRecording] = useState(EMPTY_PERMISSION)
  const [accessibility, setAccessibility] = useState(EMPTY_PERMISSION)
  const [lastOpenMessage, setLastOpenMessage] = useState('')

  const checkPermissions = useCallback(async () => {
    if (!window.electron?.permission) {
      setPlatform('browser')
      setScreenRecording({
        ...EMPTY_PERMISSION,
        checked: true,
        granted: true,
        supported: true,
        platform: 'browser',
        label: '屏幕录制',
        message: '浏览器环境下由系统共享对话框接管权限。',
      })
      setAccessibility({
        ...EMPTY_PERMISSION,
        checked: true,
        granted: true,
        supported: true,
        platform: 'browser',
        label: '输入控制',
        message: '浏览器环境下不执行本机输入注入。',
      })
      return
    }

    try {
      const result = await window.electron.permission.checkAll()
      const permissions = result?.permissions || {}
      setPlatform(result?.platform || '')
      setScreenRecording({
        checked: true,
        ...permissions.screenRecording,
      })
      setAccessibility({
        checked: true,
        ...permissions.accessibility,
      })
    } catch {
      setScreenRecording({
        ...EMPTY_PERMISSION,
        checked: true,
        granted: false,
        supported: false,
        label: '屏幕录制',
        message: '权限检测失败。',
      })
      setAccessibility({
        ...EMPTY_PERMISSION,
        checked: true,
        granted: false,
        supported: false,
        label: '输入控制',
        message: '权限检测失败。',
      })
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkPermissions()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [checkPermissions])

  const openSystemPreferences = useCallback(async (permissionType = 'privacy') => {
    if (!window.electron?.permission?.openSystemSettings) {
      const fallback = { success: false, message: '当前环境不支持打开系统设置。' }
      setLastOpenMessage(fallback.message)
      return fallback
    }

    const result = await window.electron.permission.openSystemSettings(permissionType)
    setLastOpenMessage(result?.message || '')
    return result
  }, [])

  return {
    platform,
    screenRecording,
    accessibility,
    checkPermissions,
    openSystemPreferences,
    lastOpenMessage,
    allGranted: screenRecording.granted && accessibility.granted,
    hasChecked: screenRecording.checked && accessibility.checked,
  }
}
