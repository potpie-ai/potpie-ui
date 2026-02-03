import "./loading.css";
const Loading = () => {
  return (
    <div className="w-full h-screen grid place-items-center">
      <div className="spinner">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );
};

export default Loading;
