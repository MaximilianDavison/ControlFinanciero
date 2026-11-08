export const metadata = { title: "Control financiero" };
export default function Layout({ children }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: "Arial, sans-serif",
          background: "#f6f7f9",
        }}
      >
        {children}
      </body>
    </html>
  );
}
