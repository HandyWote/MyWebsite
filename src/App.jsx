// 导入所需的组件
import Navbar from './components/Navbar';
import Home from './components/Home';
import About from './components/About';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Contact from './components/Contact';

/**
 * App组件 - 应用程序的根组件
 * 负责组织和渲染所有主要页面组件
 * 使用React Fragment (<></>) 来避免添加额外的DOM节点
 */
function App() {
  return (
    <>
      <Navbar />  {/* 导航栏组件 */}
      <Home />    {/* 首页组件 */}
      <About />   {/* 关于我组件 */}
      <Skills />  {/* 技能组件 */}
      <Projects />{/* 项目展示组件 */}
      <Contact /> {/* 联系方式组件 */}
    </>
  );
}

export default App;
