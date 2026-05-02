import Link from 'next/link'

interface AdminChromeProps {
  active: 'overview' | 'sources' | 'items' | 'billing' | 'users' | 'execution-logs'
}

export function AdminChrome({ active }: AdminChromeProps) {
  return (
    <nav className="topnav">
      <div className="container topnav__inner">
        <Link className="topnav__brand" href="/">
          reado
        </Link>
        <div className="topnav__links">
          <Link data-active={active === 'overview'} href="/admin">
            控制台
          </Link>
          <Link data-active={active === 'sources'} href="/admin/sources">
            数据源
          </Link>
          <Link data-active={active === 'items'} href="/admin/items">
            资讯
          </Link>
          <Link data-active={active === 'billing'} href="/admin/billing">
            支付日志
          </Link>
          <Link data-active={active === 'execution-logs'} href="/admin/execution-logs">
            执行过程
          </Link>
          <Link data-active={active === 'users'} href="/admin/users">
            用户
          </Link>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="nav-button" type="submit">
            退出
          </button>
        </form>
      </div>
    </nav>
  )
}
