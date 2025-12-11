bosbase use wasmtime
https://github.com/bytecodealliance/wasmtime

```
If you've got the Rust compiler installed then you can take some Rust source code:

fn main() {
    println!("Hello, world!");
}
and compile it into a WebAssembly component with:

rustup target add wasm32-wasip2
rustc hello.rs --target wasm32-wasip2
Once compiled, you can run your component:

wasmtime hello.wasm
You should see the following output:

Hello, world!

```


```
const pb = new BosBase(baseUrl);
await pb.collection("_superusers").authWithPassword(authEmail, authPassword);
console.log("[SUCCESS] Authenticated as superuser");

if (!pb.scripts) {
    throw new Error("pb.scripts is not available. Ensure the JS SDK includes the WASM_ API.");
}

const cmd = await pb.scripts.command("./wasmtime hello.wasm");
if (!cmd?.output?.includes("Hello, Bosbase")) {
    throw new Error(`Command output missing expected text: ${cmd.output}`);
}
console.log("[SUCCESS] Command output:", cmd.output);
```