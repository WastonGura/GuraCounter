import { View, Image } from '@tarojs/components'
import './index.scss'
import Taro from '@tarojs/taro'
import homeicon from '../../assets/icons/home.svg'

const Header = () => {
    const handleHomeClicked = async() => {
        await Taro.vibrateShort({
            type: 'medium'
        })
        Taro.navigateTo({
            url: '/pages/index/index'
        })
    }

    return (
        <View className='header-container'>
            <View className='homebutton' onClick={handleHomeClicked}>
                <Image src={homeicon} className='homeicon' />
            </View>
        </View>
    )
}

export default Header
