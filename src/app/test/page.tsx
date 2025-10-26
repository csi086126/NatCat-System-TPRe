export default function TestPage() {
  return (
    <div style={{padding: '40px', textAlign: 'center'}}>
      <h1>✅ 服务器正常运行！</h1>
      <p>如果您能看到这个页面，说明 Next.js 服务器工作正常。</p>
      <p>时间: {new Date().toLocaleString('zh-CN')}</p>
    </div>
  )
}
