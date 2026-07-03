import Head from "next/head";
import Header from "../components/Header";
import UploadDropzone from "../components/UploadDropzone";

export default function UploadPage() {
  return (
    <>
      <Head>
        <title>Upload your resume — Resume Roaster</title>
      </Head>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-center font-display text-3xl font-bold">
          Upload your <span className="gradient-text">resume</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-slate-400">
          PDF only, up to 8 MB. You'll get your roast and scores in about a minute.
        </p>
        <div className="mt-10">
          <UploadDropzone />
        </div>
      </main>
    </>
  );
}
