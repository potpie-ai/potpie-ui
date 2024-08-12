import Script from "next/script";

export function PaddleLoader() {
  return (
    <Script
      src="https://cdn.paddle.com/paddle/v2/paddle.js"
      strategy="lazyOnload"
      onLoad={() => {
        const Paddle = (window as any).Paddle;
        Paddle.Initialize({
          token: process.env.NEXT_PUBLIC_PADDLE_TOKEN,
          eventCallback: function (data: any) {
            if (data.name == "checkout.completed") {
              Paddle.Checkout.close();
              window.location.reload();
            }
          },
        });
        Paddle.Environment.set("sandbox");
      }}
    />
  );
}
