import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'

import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.')
    Taro.cloud.init({
      env: process.env.TARO_APP_CLOUD_ENV || '',
    })
  })

  // children 是将要会渲染的页面
  return children
}
  


export default App
