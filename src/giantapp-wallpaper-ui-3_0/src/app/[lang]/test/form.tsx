//导出一个普通组件
export default function Form({
  lang,
  dictionary,
}: {
  lang: string;
  dictionary: any;
}) {
  return (
    <>
      <p>Current locale: {lang}</p>11
      <p>This text is rendered on the server: {dictionary["local"].test}</p>
    </>
  );
}
