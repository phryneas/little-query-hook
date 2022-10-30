import { typedAllCountriesQuery } from "./handGeneratedTypes";
import { useQuery } from "./useQuery";

export const API_URL = "http://countries.trevorblades.com";

export function Countries() {
  const result = useQuery(typedAllCountriesQuery, {
    variables: {},
  });

  const { status, data, error, refetch } = result;
  if (status === "pending") {
    return <>loading, please wait!</>;
  }

  if (status === "error") {
    return (
      <>
        <h3>An error occured!</h3>
        <details>
          <summary>For details click here:</summary>
          {error.toString()}
        </details>
        This might just have been a hiccup, you can{" "}
        <button onClick={refetch}>click here to retry</button>
      </>
    );
  }
  return (
    <div className="countries">
      <ul>
        {data.countries.map((country) => (
          <li key={country.code}>
            {country.name} ({country.code})
          </li>
        ))}
      </ul>
    </div>
  );
}
