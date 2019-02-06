
export type DiffMapOptions<T> = {
    create(key: string): T;
    kept?(key: string, obj: T): void;
    removed?(key: string, obj: T): void;
};

export default function<TOutput>(opts: DiffMapOptions<TOutput>) {
    const contents: TOutput[] = [];
    const keys: string[] = [];

    let updating = false;
    function update(newKeys: ReadonlyArray<string>) {
        if (updating) {
            throw new Error("Can't update while updating");
        }

        updating = true;
        const used: boolean[] = keys.map(() => false);

        for (const newKey of newKeys) {
            const extantKeyIndex = keys.indexOf(newKey);
            if (extantKeyIndex < 0) {
                const newObj = opts.create(newKey);
                keys.push(newKey);
                contents.push(newObj);
            } else {
                used[extantKeyIndex] = true;
            }
        }
        for (let i = used.length - 1; i >= 0; i--) {
            if (used[i]) {
                if (opts.kept) {
                    opts.kept(keys[i], contents[i]);
                }
            } else {
                if (opts.removed) {
                    opts.removed(keys[i], contents[i]);
                }
                used.splice(i, 1);
                keys.splice(i, 1);
                contents.splice(i, 1);
            }
        }
        updating = false;
    }

    return {
        contents: contents as ReadonlyArray<TOutput>,
        keys: keys as ReadonlyArray<string>,
        update
    };
}
