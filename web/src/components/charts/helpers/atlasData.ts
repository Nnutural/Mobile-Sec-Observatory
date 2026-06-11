export interface AtlasNode {
  id: string;
  label_zh: string;
  description_zh: string;
  source_url?: string;
  children?: AtlasNode[];
}

export const ANDROID_ATLAS: AtlasNode = {
  id: "android-root",
  label_zh: "Android 安全模型",
  description_zh: "Android 基于 Linux 内核与 ART/Dalvik 运行时构建的多层权限治理体系。",
  source_url: "https://source.android.com/security",
  children: [
    {
      id: "sandbox",
      label_zh: "应用沙箱",
      description_zh: "每个应用以独立 UID 运行，文件系统按 UID 隔离；SELinux 强制访问控制补强。",
      source_url: "https://source.android.com/security/app-sandbox",
      children: [
        { id: "uid-isolation", label_zh: "UID 隔离", description_zh: "包名 → 唯一 UID，跨应用 IPC 必须显式声明。" },
        { id: "selinux", label_zh: "SELinux", description_zh: "强制访问控制策略，限制系统进程与 vendor 接口。" },
      ],
    },
    {
      id: "manifest",
      label_zh: "Manifest 权限声明",
      description_zh: "AndroidManifest.xml 中声明 uses-permission 与组件导出策略。",
      source_url: "https://developer.android.com/guide/topics/manifest/manifest-intro",
      children: [
        { id: "uses-permission", label_zh: "uses-permission", description_zh: "应用必须显式列出所有权限。" },
        { id: "exported", label_zh: "exported 标记", description_zh: "控制四大组件是否对外暴露。" },
      ],
    },
    {
      id: "runtime",
      label_zh: "运行时授权",
      description_zh: "Android 6.0 起 dangerous 权限须在运行时通过 requestPermissions() 申请。",
      source_url: "https://developer.android.com/guide/topics/permissions/overview",
      children: [
        { id: "dangerous", label_zh: "Dangerous 等级", description_zh: "覆盖隐私敏感的位置、相机、通讯录等权限。" },
        { id: "one-time", label_zh: "一次性授权", description_zh: "Android 11 引入一次性授权与权限自动撤销。" },
      ],
    },
    {
      id: "binder",
      label_zh: "Binder IPC",
      description_zh: "Android 内核驱动提供 Binder，进程间调用基于 transact 与 onTransact。",
      source_url: "https://source.android.com/docs/core/architecture/hidl/binder-ipc",
      children: [
        { id: "binder-check", label_zh: "权限校验", description_zh: "System Server 在 onTransact 中校验 uid 与权限。" },
        { id: "binder-token", label_zh: "Caller Token", description_zh: "通过 IPCThreadState 取调用方身份。" },
      ],
    },
    {
      id: "signature",
      label_zh: "签名校验",
      description_zh: "APK 签名方案 v1-v4；同签名应用可共享 sharedUserId 与签名权限。",
      source_url: "https://source.android.com/docs/security/features/apksigning",
      children: [
        { id: "sig-v3", label_zh: "v3 方案", description_zh: "支持密钥轮换与轮换证明。" },
        { id: "shared-uid", label_zh: "sharedUserId", description_zh: "已弃用，但旧应用可继续使用。" },
      ],
    },
  ],
};

export const OPENHARMONY_ATLAS: AtlasNode = {
  id: "openharmony-root",
  label_zh: "OpenHarmony 安全模型",
  description_zh: "OpenHarmony 通过 ATM、APL、Bundle 身份与 IPC 鉴权构建权限治理体系。",
  source_url: "https://gitee.com/openharmony/security",
  children: [
    {
      id: "atm",
      label_zh: "AccessTokenManager",
      description_zh: "每个应用获得 token，记录身份与权限授权状态；位于 atokenmanager。",
      source_url: "https://docs.openharmony.cn/pages/v4.1/zh-cn/application-dev/security/accesstoken-overview.md",
      children: [
        { id: "token", label_zh: "AccessToken", description_zh: "运行时验证调用方与权限组关系。" },
        { id: "perm-state", label_zh: "权限状态", description_zh: "ATM 持久化 grant / deny 决策。" },
      ],
    },
    {
      id: "apl",
      label_zh: "APL 分级",
      description_zh: "应用按 APL（normal / system_basic / system_core）分级，敏感权限只对高 APL 开放。",
      source_url: "https://gitee.com/openharmony/security/blob/master/services/accesstokenmanager/main/cpp/include/permission/permission_define.h",
      children: [
        { id: "normal", label_zh: "normal", description_zh: "默认级别，权限受限。" },
        { id: "system_basic", label_zh: "system_basic", description_zh: "系统应用，可声明部分敏感权限。" },
        { id: "system_core", label_zh: "system_core", description_zh: "系统核心，可访问最敏感能力。" },
      ],
    },
    {
      id: "bundle",
      label_zh: "Bundle 身份",
      description_zh: "module.json5 描述包名、版本、APL 与权限声明；bundleManager 验证完整性。",
      source_url: "https://gitee.com/openharmony/bundle_framework",
      children: [
        { id: "module-json", label_zh: "module.json5", description_zh: "声明权限与 APL，等价于 manifest。" },
        { id: "bms", label_zh: "BundleManagerService", description_zh: "安装校验签名与 APL。" },
      ],
    },
    {
      id: "ipc",
      label_zh: "IPC 鉴权",
      description_zh: "OpenHarmony IPC 通过 SAMgr / DSoftBus 与 ATM 协同完成跨进程鉴权。",
      source_url: "https://gitee.com/openharmony/communication_ipc",
      children: [
        { id: "samgr", label_zh: "SystemAbilityMgr", description_zh: "服务路由与权限校验入口。" },
        { id: "dsoftbus", label_zh: "DSoftBus", description_zh: "分布式 IPC 通道，承载跨设备调用。" },
      ],
    },
    {
      id: "declare",
      label_zh: "权限声明",
      description_zh: "声明需要的 permission 与权限组；运行时由 ATM 授权。",
      source_url: "https://docs.openharmony.cn/pages/v4.1/zh-cn/application-dev/security/permission-list.md",
      children: [
        { id: "normal-perm", label_zh: "普通权限", description_zh: "安装时自动授权。" },
        { id: "user-grant", label_zh: "user_grant", description_zh: "需弹窗申请用户授权。" },
        { id: "system-grant", label_zh: "system_grant", description_zh: "系统授权，普通应用无法声明。" },
      ],
    },
  ],
};

export type AtlasVariant = "android" | "openharmony" | "compare";

export function getAtlas(variant: AtlasVariant): AtlasNode | AtlasNode[] {
  if (variant === "android") return ANDROID_ATLAS;
  if (variant === "openharmony") return OPENHARMONY_ATLAS;
  return [ANDROID_ATLAS, OPENHARMONY_ATLAS];
}
