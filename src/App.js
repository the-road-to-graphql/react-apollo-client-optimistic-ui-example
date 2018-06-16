import React from 'react';
import gql from 'graphql-tag';
import { Query, Mutation } from 'react-apollo';

import './App.css';

const REPOSITORY_FRAGMENT = gql`
  fragment repository on Repository {
    id
    name
    url
    watchers {
      totalCount
    }
    viewerSubscription
  }
`;

const GET_REPOSITORIES_OF_ORGANIZATION = gql`
  {
    organization(login: "the-road-to-learn-react") {
      repositories(first: 20) {
        edges {
          node {
            ...repository
          }
        }
      }
    }
  }

  ${REPOSITORY_FRAGMENT}
`;

const WATCH_REPOSITORY = gql`
  mutation($id: ID!, $viewerSubscription: SubscriptionState!) {
    updateSubscription(
      input: { state: $viewerSubscription, subscribableId: $id }
    ) {
      subscribable {
        id
        viewerSubscription
      }
    }
  }
`;

const VIEWER_SUBSCRIPTIONS = {
  SUBSCRIBED: 'SUBSCRIBED',
  UNSUBSCRIBED: 'UNSUBSCRIBED',
};

const isWatch = viewerSubscription =>
  viewerSubscription === VIEWER_SUBSCRIPTIONS.SUBSCRIBED;

const updateWatch = (
  client,
  {
    data: {
      updateSubscription: {
        subscribable: { id, viewerSubscription },
      },
    },
  },
) => {
  const repository = client.readFragment({
    id: `Repository:${id}`,
    fragment: REPOSITORY_FRAGMENT,
  });

  let { totalCount } = repository.watchers;
  totalCount =
    viewerSubscription === VIEWER_SUBSCRIPTIONS.SUBSCRIBED
      ? totalCount + 1
      : totalCount - 1;

  client.writeFragment({
    id: `Repository:${id}`,
    fragment: REPOSITORY_FRAGMENT,
    data: {
      ...repository,
      watchers: {
        ...repository.watchers,
        totalCount,
      },
    },
  });
};

const App = () => (
  <Query query={GET_REPOSITORIES_OF_ORGANIZATION}>
    {({ data: { organization }, loading }) => {
      if (loading || !organization) {
        return <div>Loading ...</div>;
      }

      return (
        <Repositories repositories={organization.repositories} />
      );
    }}
  </Query>
);

const Repositories = ({ repositories }) => (
  <ul>
    {repositories.edges.map(({ node }) => (
      <li key={node.id}>
        <a href={node.url}>{node.name}</a> <Watch repository={node} />
      </li>
    ))}
  </ul>
);

const Watch = ({
  repository: { id, viewerSubscription, watchers },
}) => (
  <Mutation
    mutation={WATCH_REPOSITORY}
    variables={{
      id,
      viewerSubscription: isWatch(viewerSubscription)
        ? VIEWER_SUBSCRIPTIONS.UNSUBSCRIBED
        : VIEWER_SUBSCRIPTIONS.SUBSCRIBED,
    }}
    optimisticResponse={{
      updateSubscription: {
        __typename: 'Mutation',
        subscribable: {
          __typename: 'Repository',
          id,
          viewerSubscription: isWatch(viewerSubscription)
            ? VIEWER_SUBSCRIPTIONS.UNSUBSCRIBED
            : VIEWER_SUBSCRIPTIONS.SUBSCRIBED,
        },
      },
    }}
    update={updateWatch}
  >
    {(updateSubscription, { data, loading, error }) => (
      <button type="button" onClick={updateSubscription}>
        {watchers.totalCount}{' '}
        {isWatch(viewerSubscription) ? 'Unwatch' : 'Watch'}
      </button>
    )}
  </Mutation>
);

export default App;
