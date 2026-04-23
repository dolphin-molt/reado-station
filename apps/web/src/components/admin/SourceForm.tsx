import Link from 'next/link'

import type { AdminSource } from '@/lib/admin-data'

interface SourceFormProps {
  action: string
  source?: AdminSource
}

function listValue(value: string[] | undefined): string {
  return value?.join('\n') ?? ''
}

export function SourceForm({ action, source }: SourceFormProps) {
  return (
    <form action={action} className="admin-form" method="post">
      <div className="admin-form__grid">
        <label className="auth-field">
          <span>ID</span>
          <input defaultValue={source?.id ?? ''} disabled={Boolean(source)} name="id" required type="text" />
        </label>
        <label className="auth-field">
          <span>名称</span>
          <input defaultValue={source?.name ?? ''} name="name" required type="text" />
        </label>
        <label className="auth-field">
          <span>适配器</span>
          <input defaultValue={source?.adapter ?? 'rss'} name="adapter" required type="text" />
        </label>
        <label className="auth-field">
          <span>分类</span>
          <input defaultValue={source?.category ?? ''} name="category" type="text" />
        </label>
        <label className="auth-field">
          <span>时间窗口（小时）</span>
          <input defaultValue={source?.hours ?? 24} min="1" name="hours" required type="number" />
        </label>
        <label className="admin-checkbox">
          <input defaultChecked={source?.enabled ?? true} name="enabled" type="checkbox" />
          <span>启用采集</span>
        </label>
        <label className="admin-checkbox">
          <input defaultChecked={source?.searchable ?? false} name="searchable" type="checkbox" />
          <span>支持搜索</span>
        </label>
      </div>

      <label className="auth-field">
        <span>URL</span>
        <input defaultValue={source?.url ?? ''} name="url" type="url" />
      </label>

      <div className="admin-form__grid">
        <label className="auth-field">
          <span>关键词 / topics</span>
          <textarea defaultValue={listValue(source?.topics)} name="topics" rows={5} />
        </label>
        <label className="auth-field">
          <span>命令 / command</span>
          <textarea defaultValue={listValue(source?.command)} name="command" rows={5} />
        </label>
      </div>

      <div className="admin-form__grid">
        <label className="auth-field">
          <span>fallback adapter</span>
          <input defaultValue={source?.fallbackAdapter ?? ''} name="fallbackAdapter" type="text" />
        </label>
        <label className="auth-field">
          <span>fallback URL</span>
          <input defaultValue={source?.fallbackUrl ?? ''} name="fallbackUrl" type="url" />
        </label>
        <label className="auth-field">
          <span>Google News Query</span>
          <input defaultValue={source?.googleNewsQuery ?? ''} name="googleNewsQuery" type="text" />
        </label>
        <label className="auth-field">
          <span>strategy</span>
          <input defaultValue={source?.strategy ?? ''} name="strategy" type="text" />
        </label>
      </div>

      <label className="auth-field">
        <span>搜索命令 / searchCommand</span>
        <textarea defaultValue={listValue(source?.searchCommand)} name="searchCommand" rows={4} />
      </label>

      <div className="admin-actions">
        <button className="auth-submit" type="submit">
          保存数据源
        </button>
        <Link className="secondary-button" href="/admin/sources">
          返回列表
        </Link>
      </div>
    </form>
  )
}
